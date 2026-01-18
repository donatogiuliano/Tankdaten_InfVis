import pandas as pd
import numpy as np
import os
import glob
import concurrent.futures
from functools import partial

# PATHS
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Input: Local to this workspace
RAW_DATA_ROOT = os.path.join(BASE_DIR, 'data', 'tankerkoenig_historic')
# Output: Always backend/data
OUTPUT_DIR = os.path.join(BASE_DIR, 'data')

def load_stations_map():
    print("Loading Stations Metadata...")
    # Try different locations for robustness
    search_patterns = [
        os.path.join(RAW_DATA_ROOT, "stations", "2024", "12", "*-stations.csv"),
        os.path.join(RAW_DATA_ROOT, "stations", "**", "*-stations.csv")
    ]
    
    stations_files = []
    for p in search_patterns:
        stations_files.extend(glob.glob(p, recursive=True))
    
    if not stations_files:
        raise FileNotFoundError(f"No stations found in {RAW_DATA_ROOT}")
        
    target_file = sorted(stations_files)[-1]
    print(f"Using Stations File: {target_file}")
    
    df = pd.read_csv(target_file, usecols=['uuid', 'post_code', 'latitude', 'longitude'])
    df['plz'] = pd.to_numeric(df['post_code'], errors='coerce')
    df = df.dropna(subset=['plz', 'latitude', 'longitude'])
    df = df[(df['plz'] >= 1000) & (df['plz'] <= 99999)]
    df['plz2'] = df['post_code'].astype(str).str.zfill(5).str[:2]
    
    # Map for processing
    station_map = df.set_index('uuid')['plz2'].to_dict()
    
    # Calculate Centroids
    centroids = df.groupby('plz2')[['latitude', 'longitude']].mean().reset_index()
    centroids.rename(columns={'latitude': 'lat', 'longitude': 'lon'}, inplace=True)
    
    return station_map, centroids

def generate_macro_data(date_range):
    # Deterministic simulation for reproducibility
    np.random.seed(42)
    brent_base = 77.0
    brent_prices = [brent_base]
    fx_base = 1.10
    fx_rates = [fx_base]
    
    for _ in range(len(date_range) - 1):
        brent_prices.append(max(60, brent_prices[-1] + np.random.normal(0, 1.5)))
        fx_rates.append(max(0.95, fx_rates[-1] + np.random.normal(0, 0.005)))
        
    df = pd.DataFrame({
        'date': date_range,
        'brent_oil_usd': np.round(brent_prices, 2),
        'exchange_rate_eur_usd': np.round(fx_rates, 4)
    })
    df['brent_oil_eur'] = round(df['brent_oil_usd'] / df['exchange_rate_eur_usd'], 2)
    return df

def process_single_file(file_path, station_map=None):
    cols_to_use = ['date', 'station_uuid', 'diesel', 'e5', 'e10']
    try:
        df = pd.read_csv(file_path, usecols=cols_to_use, engine='pyarrow')
        if df.empty: return None
        
        filename_date = os.path.basename(file_path)[:10]
        current_date = pd.to_datetime(filename_date)
        
        if station_map:
            df['region_plz2'] = df['station_uuid'].map(station_map)
            df = df.dropna(subset=['region_plz2'])
        else:
            return None
            
        for col in ['diesel', 'e5', 'e10']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            
        df_melt = df.melt(id_vars=['region_plz2'], value_vars=['diesel', 'e5', 'e10'], 
                          var_name='fuel', value_name='price')
        df_melt = df_melt[df_melt['price'] > 0.1]
        
        if df_melt.empty: return None

        agg = df_melt.groupby(['region_plz2', 'fuel'])['price'].agg(['mean', 'std', 'min', 'max']).reset_index()
        agg['date'] = current_date
        agg.rename(columns={'mean': 'price_mean', 'std': 'price_std', 'min': 'price_min', 'max': 'price_max'}, inplace=True)
        agg['price_std'] = agg['price_std'].fillna(0)
        
        return agg
    except Exception as e:
        print(f"Error in {os.path.basename(file_path)}: {e}")
        return None

def main():
    if not os.path.exists(RAW_DATA_ROOT):
        print(f"ERROR: Raw Data Path not found: {RAW_DATA_ROOT}")
        return

    station_map, centroids = load_stations_map()
    price_files = glob.glob(os.path.join(RAW_DATA_ROOT, "prices", "2024", "**", "*-prices.csv"), recursive=True)
    price_files.sort()
    
    print(f"Found {len(price_files)} daily files. Starting processing...")
    
    daily_aggregated = []
    
    with concurrent.futures.ProcessPoolExecutor() as executor:
        worker = partial(process_single_file, station_map=station_map)
        results = list(executor.map(worker, price_files))
        
    daily_aggregated = [r for r in results if r is not None]
    
    if not daily_aggregated:
        print("No data found!")
        return

    # Concat & Sort
    df_full = pd.concat(daily_aggregated, ignore_index=True)
    df_full.sort_values(['date', 'region_plz2', 'fuel'], inplace=True)
    
    # Merge Centroids (Lat/Lon)
    print("Merging Lat/Lon Centroids...")
    df_full = df_full.merge(centroids, left_on='region_plz2', right_on='plz2', how='left')
    df_full.drop(columns=['plz2'], inplace=True)

    # Macro
    print("Merging Macro Data...")
    df_macro = generate_macro_data(df_full['date'].unique())
    df_full = df_full.merge(df_macro, on='date', how='left')
    
    # Features
    print("Calculating Features...")
    df_full['ma_7d'] = df_full.groupby(['region_plz2', 'fuel'])['price_mean'] \
                        .transform(lambda x: x.rolling(window=7, min_periods=1).mean())
    df_full['trend_slope'] = df_full.groupby(['region_plz2', 'fuel'])['price_mean'].diff(7).fillna(0)

    # Save Daily (Overwrite)
    out_daily = os.path.join(OUTPUT_DIR, 'data_daily.parquet')
    print(f"Saving Daily: {out_daily}")
    df_full.to_parquet(out_daily, index=False)
    
    # Weekly
    print("Aggregating Weekly...")
    df_full['year_week'] = df_full['date'].dt.isocalendar().year.astype(str) + "-W" + \
                           df_full['date'].dt.isocalendar().week.astype(str).str.zfill(2)
                           
    df_weekly = df_full.groupby(['year_week', 'region_plz2', 'fuel']).agg({
        'price_mean': 'mean', 'price_std': 'mean',
        'brent_oil_eur': 'mean', 'exchange_rate_eur_usd': 'mean', 'date': 'min',
        'lat': 'first', 'lon': 'first' # Preserve Coordinates
    }).reset_index()
    
    df_weekly['change_pct'] = df_weekly.groupby(['region_plz2', 'fuel'])['price_mean'].pct_change().fillna(0)
    df_weekly['rank'] = df_weekly.groupby(['year_week', 'fuel'])['price_mean'].rank(method='min').astype(int)
    
    out_weekly = os.path.join(OUTPUT_DIR, 'data_weekly.parquet')
    df_weekly.to_parquet(out_weekly, index=False)
    
    # Monthly
    print("Aggregating Monthly...")
    df_full['year_month'] = df_full['date'].dt.strftime('%Y-%m')
    df_monthly = df_full.groupby(['year_month', 'region_plz2', 'fuel']).agg({
        'price_mean': 'mean', 'price_std': 'mean',
        'brent_oil_eur': 'mean', 'exchange_rate_eur_usd': 'mean', 'date': 'min',
        'lat': 'first', 'lon': 'first' # Preserve Coordinates
    }).reset_index()
    df_monthly['rank'] = df_monthly.groupby(['year_month', 'fuel'])['price_mean'].rank(method='min').astype(int)
    
    out_monthly = os.path.join(OUTPUT_DIR, 'data_monthly.parquet')
    df_monthly.to_parquet(out_monthly, index=False)
    
    print("ALL DONE.")

if __name__ == "__main__":
    main()
