import pandas as pd
import numpy as np
import os
import json
import argparse

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # /backend
DATA_DIR = os.path.join(BASE_DIR, 'data')
CACHE_DIR = os.path.join(DATA_DIR, 'cache')

def prepare_regional_data(year):
    parquet_file = os.path.join(DATA_DIR, f'data_daily_{year}.parquet')
    print(f"Reading {parquet_file}...")
    try:
        df = pd.read_parquet(parquet_file)
    except FileNotFoundError:
        print(f"Data file not found: {parquet_file}")
        return

    if 'date' not in df.columns or 'price_mean' not in df.columns or 'lat' not in df.columns:
        print("Missing required columns ({date, price_mean, lat, lon, fuel}).")
        return

    df['date'] = pd.to_datetime(df['date'])
    df['year'] = df['date'].dt.year

    # Filter for the specific year just in case
    df = df[df['year'] == year]

    if df.empty:
        print(f"No data found for year {year}")
        return

    # Grid Configuration
    GRID_STEP = 0.1 # High Resolution (approx 7-11km)

    print(f"Processing {year}...")
    
    # 1. Real Data (PLZ-3 Centroids)
    df['month'] = df['date'].dt.month
    
    # Aggregate MEDIAN price per location/month/fuel (User requirement)
    agg_long = df.groupby(['month', 'lat', 'lon', 'fuel'])['price_mean'].median().reset_index()
    
    # Pivot to Wide
    real_points_df = agg_long.pivot_table(index=['month', 'lat', 'lon'], columns='fuel', values='price_mean').reset_index()
    
    # Ensure columns exist
    for c in ['e5', 'e10', 'diesel']:
        if c not in real_points_df.columns:
            real_points_df[c] = None

    # 2. Generate Target Grid (Dense)
    lat_range = np.arange(47.0, 56.0 + GRID_STEP, GRID_STEP)
    lon_range = np.arange(5.0, 16.0 + GRID_STEP, GRID_STEP)
    
    final_rows = []
    months = sorted(real_points_df['month'].unique())
    
    print(f"  Rasterizing ({GRID_STEP} deg) with Nearest Neighbor...")

    for m in months:
        # Get real points for this month
        mpoints = real_points_df[real_points_df['month'] == m]
        if mpoints.empty: continue
        
        # Convert to numpy for fast distance calc
        # coords: (N, 2)
        src_coords = mpoints[['lat', 'lon']].values
        src_e5 = mpoints['e5'].values
        src_e10 = mpoints['e10'].values
        src_diesel = mpoints['diesel'].values

        # Generate Grid Points for this month
        grid_lat, grid_lon = np.meshgrid(lat_range, lon_range, indexing='ij')
        # flatten
        flat_glat = grid_lat.ravel()
        flat_glon = grid_lon.ravel()
        target_coords = np.column_stack((flat_glat, flat_glon)) # (M, 2)
        
        # Expand dims: Target (M, 1, 2) - Source (1, N, 2)
        # Note: Optimization for large datasets would involve KDTree, but brute force is fine here
        dists_sq = np.sum((target_coords[:, np.newaxis, :] - src_coords[np.newaxis, :, :]) ** 2, axis=2)
        min_indices = np.argmin(dists_sq, axis=1) # (M,) indices of closest source
        min_dists = np.sqrt(np.min(dists_sq, axis=1)) # (M,) degrees
        
        # Filter Max Distance (e.g. 0.8 degrees ~ 80km) to avoid outlier projection
        valid_mask = min_dists < 0.8 
        
        # Select values
        sel_e5 = src_e5[min_indices]
        sel_e10 = src_e10[min_indices]
        sel_diesel = src_diesel[min_indices]
        
        # Write results
        # Only keep valid
        valid_indices = np.where(valid_mask)[0]
        
        for idx in valid_indices:
            # Ensure native types and finite values
            mlat = float(flat_glat[idx])
            mlon = float(flat_glon[idx])
            
            if not np.isfinite(mlat) or not np.isfinite(mlon):
                continue

            final_rows.append({
                'month': int(m),
                'lat': mlat,
                'lon': mlon,
                'e5': float(sel_e5[idx]) if sel_e5[idx] is not None and np.isfinite(sel_e5[idx]) else None,
                'e10': float(sel_e10[idx]) if sel_e10[idx] is not None and np.isfinite(sel_e10[idx]) else None,
                'diesel': float(sel_diesel[idx]) if sel_diesel[idx] is not None and np.isfinite(sel_diesel[idx]) else None
            })
    
    # Save straight away
    out_file = os.path.join(CACHE_DIR, f'regional_{year}.json')
    with open(out_file, 'w') as f:
        json.dump(final_rows, f)
        
    print(f"Saved {len(final_rows)} dense cells to {out_file}.")

if __name__ == "__main__":
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
        
    parser = argparse.ArgumentParser(description='Generate regional cache for a specific year.')
    parser.add_argument('--year', type=int, required=True, help='Year to process (e.g., 2019, 2024)')
    args = parser.parse_args()
    
    prepare_regional_data(args.year)
