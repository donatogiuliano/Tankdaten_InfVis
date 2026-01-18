import pandas as pd
import os
import json

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # /backend
DATA_DIR = os.path.join(BASE_DIR, 'data')
CACHE_DIR = os.path.join(DATA_DIR, 'cache')
PARQUET_FILE = os.path.join(DATA_DIR, 'data_daily.parquet')

def prepare_regional_data():
    print(f"Reading {PARQUET_FILE}...")
    try:
        df = pd.read_parquet(PARQUET_FILE)
    except FileNotFoundError:
        print("Data file not found.")
        return

    if 'date' not in df.columns or 'region_plz2' not in df.columns or 'price_mean' not in df.columns:
        print("Missing required columns (date, region_plz2, price_mean, fuel).")
        return

    df['date'] = pd.to_datetime(df['date'])
    df['year'] = df['date'].dt.year

    # Get unique years
    # --- Process Years ---
    years = df['year'].unique()
    print(f"Found years: {years}")
    
    # Grid Configuration
    GRID_STEP = 0.2 # Degrees (~20km)

    for year in years:
        print(f"Processing {year}...")
        df_year = df[df['year'] == year].copy()
        
        # 1. Create Grid Bins
        # Floor to nearest step
        df_year['lat_bin'] = (df_year['lat'] // GRID_STEP) * GRID_STEP
        df_year['lon_bin'] = (df_year['lon'] // GRID_STEP) * GRID_STEP
        
        df_year['month'] = df_year['date'].dt.month
        
        # 2. Aggregate per Grid Cell/Month/Fuel
        agg = df_year.groupby(['lat_bin', 'lon_bin', 'month', 'fuel'])['price_mean'].mean().reset_index()
        
        # 3. Pivot
        pivot = agg.pivot(index=['lat_bin', 'lon_bin', 'month'], columns='fuel', values='price_mean').reset_index()
        
        # 4. Cleanup & Formatting
        pivot.rename(columns={'lat_bin': 'lat', 'lon_bin': 'lon'}, inplace=True)
        
        # Add half-step to center the rectangle (optional, or handle in frontend)
        # Frontend expects Top-Left or Center? Let's provide Bottom-Left (bin origin) + step info,
        # OR just provide Center. L.rectangle needs bounds. 
        # Let's keep it as the 'origin' (bottom-left) of the cell for simple math in frontend: [lat, lon] -> [lat+step, lon+step]
        
        pivot['lat'] = pivot['lat'].round(4)
        pivot['lon'] = pivot['lon'].round(4)
        
        for col in ['e5', 'e10', 'diesel']:
            if col not in pivot.columns:
                pivot[col] = None 
            else:
                pivot[col] = pivot[col].round(3)

        # Save to JSON
        # Include metadata about grid size? simpler to hardcode or infer.
        filename = f'regional_{year}.json'
        path = os.path.join(CACHE_DIR, filename)
        
        # Add extra property to JSON wrapping the data? No, keep array for simplicity.
        # But we really should tell frontend the Grid Step.
        # Let's stick to array, frontend defines step size or we infer it.
        # Actually, let's just save valid clean JSON.
        
        pivot.to_json(path, orient='records')
        print(f"Saved {path}")

    print("Done! Regional data cached.")

if __name__ == "__main__":
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
    prepare_regional_data()
