
import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

FUELS = ['e5', 'e10', 'diesel']

# Limit regions to valid German PLZ2 ranges (approx overview)
# 01-99 are theoretical, simulating all for completeness as requested
ALL_REGIONS = [f"{i:02d}" for i in range(1, 100)]

def generate_macro_data(date_range):
    """
    Generates simulated Macroeconomic data for 2024.
    Returns DataFrame with [date, brent_usd, exchange_rate, brent_eur]
    """
    print("Generating Macro Data (Brent & FX)...")
    
    # 1. Brent Oil (USD) - Start ~77$, fluctuate
    brent_base = 77.0
    brent_prices = [brent_base]
    
    # 2. Exchange Rate EUR/USD - Start ~1.10
    fx_base = 1.10
    fx_rates = [fx_base]
    
    for _ in range(len(date_range) - 1):
        # Random Walk
        brent_prices.append(max(60, brent_prices[-1] + np.random.normal(0, 1.5)))
        fx_rates.append(max(0.95, fx_rates[-1] + np.random.normal(0, 0.005)))
        
    df = pd.DataFrame({
        'date': date_range,
        'brent_oil_usd': np.round(brent_prices, 2),
        'exchange_rate_eur_usd': np.round(fx_rates, 4)
    })
    
    df['brent_oil_eur'] = round(df['brent_oil_usd'] / df['exchange_rate_eur_usd'], 2)
    return df

def generate_2024_dataset():
    print("Generating full dataset for 2024 (01-99 PLZ)...")
    
    # 1. Date Range: Full Year 2024
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2024, 12, 31)
    date_range = pd.date_range(start=start_date, end=end_date, freq='D')
    
    days_count = len(date_range)
    print(f"Timeframe: {start_date.date()} to {end_date.date()} ({days_count} days)")
    
    # 2. Simulate Macro Data
    df_macro = generate_macro_data(date_range)
    
    # 3. Simulate Fuel Data
    records = []
    
    # Pre-calc offsets for performance (vectorized approach would be better for distinct rows, 
    # but loop is fine for generating ~100k rows once)
    
    # Base Fuel Params including tax/margin buffer
    base_prices = {'e5': 1.76, 'e10': 1.70, 'diesel': 1.62}
    region_offsets = {r: np.random.uniform(-0.05, 0.05) for r in ALL_REGIONS}
    
    # To speed up: iterate days, then vector logic? 
    # Actually, let's keep it readable. 100k rows is fast.
    
    for day_idx, date in enumerate(date_range):
        # Macro Influence (Oil Price drives Pump Price)
        # Simple correlation: 10% change in Oil -> ~3% change in Pump (dampened)
        oil_price = df_macro.iloc[day_idx]['brent_oil_eur']
        oil_factor = (oil_price - 70) * 0.015 # 0.015 EUR per 1 EUR Oil change
        
        # Seasonality
        month = date.month
        seasonality = 0.04 if 6 <= month <= 8 else 0
        
        for fuel in FUELS:
            base = base_prices[fuel] + oil_factor + seasonality
            
            for region in ALL_REGIONS:
                # Regional daily fluctuation
                reg_noise = np.random.normal(0, 0.005)
                final_price = base + region_offsets[region] + reg_noise
                
                # Volatility
                std = np.random.uniform(0.01, 0.04)
                
                records.append({
                    'date': date,
                    'year_week': f"{date.isocalendar()[0]}-W{date.isocalendar()[1]:02d}",
                    'year_month': f"{date.year}-{date.month:02d}",
                    'region_plz2': region,
                    'fuel': fuel,
                    'price_mean': round(final_price, 3),
                    'price_std': round(std, 4),
                    # Min/Max are just extended from mean/std for simulation
                    'price_min': round(final_price - std*2, 3),
                    'price_max': round(final_price + std*2, 3),
                    # Derived from Macro (will be merged properly, but adding raw link here if needed)
                    # better to merge macro df later to avoid redundancy in dict
                })
                
    df = pd.DataFrame(records)
    
    print("Merging Macro Data...")
    # Merge Daily
    df = df.merge(df_macro, on='date', how='left')
    
    print("Calculating Features...")
    # Sort for rolling calc
    df.sort_values(['region_plz2', 'fuel', 'date'], inplace=True)
    
    # Feature: MA 7D
    df['ma_7d'] = df.groupby(['region_plz2', 'fuel'])['price_mean'] \
                    .transform(lambda x: x.rolling(window=7, min_periods=1).mean())
    df['ma_7d'] = df['ma_7d'].round(3)

    # Feature: Slope (last 7 days)
    # df['trend_slope'] -> removing if requested to "delete empty columns" or ensures it's filled
    # Let's keep it but calculate it properly to ensure no NaNs/Empty
    df['trend_slope'] = df.groupby(['region_plz2', 'fuel'])['price_mean'] \
                          .diff(7).div(7).round(4).fillna(0)
    
    # 4. Save Daily Parquet
    print("Saving Daily...")
    # Select columns to ensure clean output
    cols_daily = [
        'date', 'region_plz2', 'fuel', 
        'price_mean', 'price_std', 'price_min', 'price_max', 
        'ma_7d', 'trend_slope',
        'brent_oil_usd', 'exchange_rate_eur_usd', 'brent_oil_eur'
    ]
    df[cols_daily].to_parquet(os.path.join(DATA_DIR, 'data_daily.parquet'), index=False)
    
    # 5. Aggregate Weekly
    print("Aggregating Weekly...")
    # Aggregation rules
    agg_rules = {
        'price_mean': 'mean',
        'price_std': 'mean',
        'brent_oil_eur': 'mean',
        'exchange_rate_eur_usd': 'mean',
        'date': 'min'
    }
    df_weekly = df.groupby(['year_week', 'region_plz2', 'fuel']).agg(agg_rules).reset_index()
    
    # Re-calc rank/change for weekly
    df_weekly.sort_values(['region_plz2', 'fuel', 'date'], inplace=True)
    df_weekly['change_pct'] = df_weekly.groupby(['region_plz2', 'fuel'])['price_mean'].pct_change().fillna(0)
    df_weekly['rank'] = df_weekly.groupby(['year_week', 'fuel'])['price_mean'].rank(method='min').astype(int)
    
    df_weekly.to_parquet(os.path.join(DATA_DIR, 'data_weekly.parquet'), index=False)
    
    # 6. Aggregate Monthly
    print("Aggregating Monthly...")
    df_monthly = df.groupby(['year_month', 'region_plz2', 'fuel']).agg(agg_rules).reset_index()
    
    # Re-calc rank for monthly
    df_monthly['rank'] = df_monthly.groupby(['year_month', 'fuel'])['price_mean'].rank(method='min').astype(int)
    
    df_monthly.to_parquet(os.path.join(DATA_DIR, 'data_monthly.parquet'), index=False)
    
    # 7. Map Snapshot (Latest Day)
    print("Updating Map Snapshot...")
    latest_date = df['date'].max()
    df_latest = df[df['date'] == latest_date].copy()
    
    # Rough coord generation for 99 regions (Simulated centroid for visualization)
    # In reality, you'd merge a PLZ->Lat/Lon CSV.
    # Simulating a grid for visual spread
    def get_dummy_coord(plz):
        p = int(plz)
        # Simple math to spread them out on a lat/lon map around Germany center
        # S-N: 47.3 - 55.0 (~7.7 deg), W-E: 6.0 - 15.0 (~9 deg)
        # Using PLZ first digit for rough region
        lat = 47.5 + (p / 100) * 7.5 + np.random.uniform(-0.1, 0.1)
        lon = 6.5 + ((p % 10) / 10) * 8.0 + np.random.uniform(-0.1, 0.1)
        return lat, lon

    coords = [get_dummy_coord(r) for r in df_latest['region_plz2']]
    df_latest['latitude'] = [c[0] for c in coords]
    df_latest['longitude'] = [c[1] for c in coords]
    df_latest['station_name'] = "Region " + df_latest['region_plz2']
    df_latest['city'] = "Deutschland"
    
    df_latest[['fuel', 'price_mean', 'latitude', 'longitude', 'station_name', 'city']].to_parquet(os.path.join(DATA_DIR, 'data_map_snapshot.parquet'), index=False)

    print("Done.")

if __name__ == "__main__":
    generate_2024_dataset()
