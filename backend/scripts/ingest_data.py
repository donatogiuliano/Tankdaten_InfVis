import pandas as pd
import numpy as np
import os
import glob
import concurrent.futures
from functools import partial
import requests
import xml.etree.ElementTree as ET
import argparse
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DATA_ROOT = os.path.join(BASE_DIR, 'data', 'tankerkoenig_historic')
OUTPUT_DIR = os.path.join(BASE_DIR, 'data')

def load_stations_map(year):
    print(f"Loading Stations Metadata for {year}...")
    search_patterns = [
        os.path.join(RAW_DATA_ROOT, "stations", str(year), "**", "*-stations.csv"),
    ]
    
    stations_files = []
    for p in search_patterns:
        stations_files.extend(glob.glob(p, recursive=True))
    
    if not stations_files:
        print(f"Warning: No specific stations found for {year}, trying all...")
        stations_files = glob.glob(os.path.join(RAW_DATA_ROOT, "stations", "**", "*-stations.csv"), recursive=True)

    if not stations_files:
        raise FileNotFoundError(f"No stations found in {RAW_DATA_ROOT}")
        
    target_file = sorted(stations_files)[-1]
    print(f"Using Stations File: {target_file}")
    
    df = pd.read_csv(target_file, usecols=['uuid', 'post_code', 'latitude', 'longitude'])
    df['plz'] = pd.to_numeric(df['post_code'], errors='coerce')
    df = df.dropna(subset=['plz', 'latitude', 'longitude'])
    df = df[(df['plz'] >= 1000) & (df['plz'] <= 99999)]
    df['plz3'] = df['post_code'].astype(str).str.zfill(5).str[:3]
    
    station_map = df.set_index('uuid')['plz3'].to_dict()
    
    centroids = df.groupby('plz3')[['latitude', 'longitude']].mean().reset_index()
    centroids.rename(columns={'latitude': 'lat', 'longitude': 'lon'}, inplace=True)
    
    return station_map, centroids

OIL_URL = "https://www.eia.gov/dnav/pet/hist_xls/RBRTEd.xls"
ECB_URL = "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/usd.xml"

def fetch_real_macro_data(date_range):
    """Fetches real Oil and FX data and merges it with the target date range."""
    print("Fetching Real Macro Data...")
    
    print(f"  - Fetching Oil from {OIL_URL}...")
    try:
        df_oil = pd.read_excel(OIL_URL, sheet_name="Data 1", skiprows=2, engine="xlrd")
        df_oil.columns = ["date", "brent_oil_usd"]
        df_oil = df_oil.dropna()
        df_oil["date"] = pd.to_datetime(df_oil["date"])
        df_oil.set_index("date", inplace=True)
    except Exception as e:
        print(f"    WARNING: Failed to fetch Oil data ({e}). Using fallback.")
        df_oil = pd.DataFrame()

    # 2. Fetch FX (USD/EUR)
    print(f"  - Fetching FX from {ECB_URL}...")
    try:
        response = requests.get(ECB_URL)
        response.raise_for_status()
        root = ET.fromstring(response.content)
        records = []
        for obs in root.iter():
            if obs.tag.endswith("Obs") and obs.attrib.get("TIME_PERIOD"):
                try:
                    records.append({
                        "date": pd.to_datetime(obs.attrib.get("TIME_PERIOD")),
                        "exchange_rate_eur_usd": float(obs.attrib.get("OBS_VALUE"))
                    })
                except: continue
        df_fx = pd.DataFrame(records)
        df_fx.set_index("date", inplace=True)
    except Exception as e:
        print(f"    WARNING: Failed to fetch FX data ({e}). Using fallback.")
        df_fx = pd.DataFrame()

    # 3. Create Base DataFrame from Input Date Range
    df_base = pd.DataFrame({'date': date_range})
    df_base.set_index('date', inplace=True)
    df_base.sort_index(inplace=True)

    # 4. Merge and Forward Fill (Stocks closed on weekends)
    df_macro = df_base.join(df_oil, how='left').join(df_fx, how='left')
    df_macro.fillna(method='ffill', inplace=True)
    df_macro.fillna(method='bfill', inplace=True)

    # 5. Calculate Euro Price
    if 'brent_oil_usd' in df_macro.columns and 'exchange_rate_eur_usd' in df_macro.columns:
        df_macro['brent_oil_eur'] = round(df_macro['brent_oil_usd'] / df_macro['exchange_rate_eur_usd'], 2)
    else:
        df_macro['brent_oil_eur'] = 0.0

    return df_macro.reset_index()

def generate_macro_data(date_range):
    return fetch_real_macro_data(date_range)

def process_single_file(file_path, station_map=None):
    cols_to_use = ['date', 'station_uuid', 'diesel', 'e5', 'e10']
    try:
        df = pd.read_csv(file_path, usecols=cols_to_use, engine='pyarrow')
        if df.empty: return None
        
        filename_date = os.path.basename(file_path)[:10]
        current_date = pd.to_datetime(filename_date)
        
        if station_map:
            df['region_plz3'] = df['station_uuid'].map(station_map)
            df = df.dropna(subset=['region_plz3'])
        else:
            return None
            
        for col in ['diesel', 'e5', 'e10']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            
        df_melt = df.melt(id_vars=['region_plz3'], value_vars=['diesel', 'e5', 'e10'], 
                          var_name='fuel', value_name='price')
        df_melt = df_melt[df_melt['price'] > 0.1]
        
        if df_melt.empty: return None

        agg = df_melt.groupby(['region_plz3', 'fuel'])['price'].agg(['mean', 'std', 'min', 'max']).reset_index()
        agg['date'] = current_date
        agg.rename(columns={'mean': 'price_mean', 'std': 'price_std', 'min': 'price_min', 'max': 'price_max'}, inplace=True)
        agg['price_std'] = agg['price_std'].fillna(0)
        
        return agg
    except Exception as e:
        print(f"Error in {os.path.basename(file_path)}: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Process Tankerkoenig data for a specific year.')
    parser.add_argument('--year', type=int, required=True, help='Year to process (e.g., 2019, 2024)')
    args = parser.parse_args()
    
    year = args.year
    print(f"Processing data for YEAR: {year}")

    if not os.path.exists(RAW_DATA_ROOT):
        print(f"ERROR: Raw Data Path not found: {RAW_DATA_ROOT}")
        return

    station_map, centroids = load_stations_map(year)
    
    # Prices path for specific year
    price_files = glob.glob(os.path.join(RAW_DATA_ROOT, "prices", str(year), "**", "*-prices.csv"), recursive=True)
    price_files.sort()
    
    print(f"Found {len(price_files)} daily files for {year}. Starting processing...")
    
    if not price_files:
        print(f"No price files found for year {year} in {os.path.join(RAW_DATA_ROOT, 'prices', str(year))}")
        return
    
    daily_aggregated = []
    
    with concurrent.futures.ProcessPoolExecutor() as executor:
        worker = partial(process_single_file, station_map=station_map)
        results = list(executor.map(worker, price_files))
        
    daily_aggregated = [r for r in results if r is not None]
    
    if not daily_aggregated:
        print("No data found after processing!")
        return

    # Concat & Sort
    df_full = pd.concat(daily_aggregated, ignore_index=True)
    df_full.sort_values(['date', 'region_plz3', 'fuel'], inplace=True)
    
    # Merge Centroids (Lat/Lon)
    print("Merging Lat/Lon Centroids...")
    df_full = df_full.merge(centroids, left_on='region_plz3', right_on='plz3', how='left')
    df_full.drop(columns=['plz3'], inplace=True)

    # Macro Data Generation (Real Data)
    print("Fetching/Merging Macro Data...")
    df_macro = generate_macro_data(df_full['date'].unique())
    df_full = df_full.merge(df_macro, on='date', how='left')
    
    # Features
    print("Calculating Features...")
    df_full['ma_7d'] = df_full.groupby(['region_plz3', 'fuel'])['price_mean'] \
                        .transform(lambda x: x.rolling(window=7, min_periods=1).mean())
    df_full['trend_slope'] = df_full.groupby(['region_plz3', 'fuel'])['price_mean'].diff(7).fillna(0)

    # Save Daily
    out_daily = os.path.join(OUTPUT_DIR, f'data_daily_{year}.parquet')
    print(f"Saving Daily: {out_daily}")
    df_full.to_parquet(out_daily, index=False)
    
    # Weekly
    print("Aggregating Weekly...")
    df_full['year_week'] = df_full['date'].dt.isocalendar().year.astype(str) + "-W" + \
                           df_full['date'].dt.isocalendar().week.astype(str).str.zfill(2)
                           
    df_weekly = df_full.groupby(['year_week', 'region_plz3', 'fuel']).agg({
        'price_mean': 'mean', 'price_std': 'mean',
        'brent_oil_eur': 'mean', 'exchange_rate_eur_usd': 'mean', 'date': 'min',
        'lat': 'first', 'lon': 'first' # Preserve Coordinates
    }).reset_index()
    
    df_weekly['change_pct'] = df_weekly.groupby(['region_plz3', 'fuel'])['price_mean'].pct_change().fillna(0)
    df_weekly['rank'] = df_weekly.groupby(['year_week', 'fuel'])['price_mean'].rank(method='min').astype(int)
    
    out_weekly = os.path.join(OUTPUT_DIR, f'data_weekly_{year}.parquet')
    df_weekly.to_parquet(out_weekly, index=False)
    
    # Monthly
    print("Aggregating Monthly...")
    df_full['year_month'] = df_full['date'].dt.strftime('%Y-%m')
    df_monthly = df_full.groupby(['year_month', 'region_plz3', 'fuel']).agg({
        'price_mean': 'mean', 'price_std': 'mean',
        'brent_oil_eur': 'mean', 'exchange_rate_eur_usd': 'mean', 'date': 'min',
        'lat': 'first', 'lon': 'first' # Preserve Coordinates
    }).reset_index()
    df_monthly['rank'] = df_monthly.groupby(['year_month', 'fuel'])['price_mean'].rank(method='min').astype(int)
    
    out_monthly = os.path.join(OUTPUT_DIR, f'data_monthly_{year}.parquet')
    df_monthly.to_parquet(out_monthly, index=False)
    
    print("ALL DONE.")

if __name__ == "__main__":
    main()
