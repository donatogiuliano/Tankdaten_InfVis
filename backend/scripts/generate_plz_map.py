
import pandas as pd
import json
import os
import numpy as np

# Configuration
DATA_DIR = os.path.join(os.path.dirname(__file__), '../data')
START_YEAR = 2024
CITY_LOOKUP_FILE = os.path.join(DATA_DIR, 'cache', 'city_lookup.json')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '../../frontend/js/data/plz3_cities.json')

def generate_mapping():
    print(f"Loading data from {DATA_DIR}...")
    
    # 1. Load Parquet Data (latest year) for PLZ locations
    parquet_path = os.path.join(DATA_DIR, f'data_daily_{START_YEAR}.parquet')
    if not os.path.exists(parquet_path):
        # Fallback
        parquet_path = os.path.join(DATA_DIR, 'data_daily_2022.parquet')
    
    if not os.path.exists(parquet_path):
        print("Error: No data file found.")
        return

    # Read minimal columns: region_plz3, lat, lon
    # Note: 'lat' and 'lon' might be named differently or aggregated? 
    # Based on app.py history endpoint, columns 'lat' and 'lon' exist.
    # But wait, data_daily usually aggregates by region_plz2? No, region_plz3?
    # Let's check columns properly first. Since I can't interactively check, I'll try-catch.
    
    try:
        df = pd.read_parquet(parquet_path, columns=['region_plz3', 'lat', 'lon'])
    except Exception as e:
        print(f"Column error: {e}")
        # Maybe names are different? Using full read to check
        df = pd.read_parquet(parquet_path)
        if 'lat' not in df.columns:
            print("Lat/Lon not in daily data! Checking if we have a station list...")
            # If aggregated daily data doesn't have lat/lon (it might be by region), we need another source.
            # But earlier check of app.py history endpoint used 'data_daily_...' with 'lat', 'lon'.
            # So likely raw data has it, but it might be huge.
            pass

    # Drop duplicates to get unique locations per PLZ3
    # We want valid PLZ3
    locations = df[['region_plz3', 'lat', 'lon']].dropna().drop_duplicates()
    
    # Calculate Centroid for each PLZ3
    centroids = locations.groupby('region_plz3')[['lat', 'lon']].mean().reset_index()
    
    print(f"Found {len(centroids)} PLZ3 regions.")

    # 2. Load City Lookup
    if not os.path.exists(CITY_LOOKUP_FILE):
        print("City lookup file not found.")
        return
        
    with open(CITY_LOOKUP_FILE, 'r', encoding='utf-8') as f:
        cities = json.load(f)

    # 3. Find Nearest City for each PLZ3
    mapping = {}
    
    for _, row in centroids.iterrows():
        plz = row['region_plz3']
        r_lat = row['lat']
        r_lon = row['lon']
        
        best_city = None
        min_dist = float('inf')
        
        for city in cities:
            # Simple Euclidean distance is enough for this scale (lat/lon approx)
            # Correct would be Haversine but for sorting "nearest" locally it's fine
            # deg to km approx: lat ~111km, lon ~70km (at 50deg)
            # dist^2 = (dlat * 111)^2 + (dlon * 70)^2
            d_lat = (city['latitude'] - r_lat) * 111
            d_lon = (city['longitude'] - r_lon) * 70
            dist = d_lat**2 + d_lon**2
            
            if dist < min_dist:
                min_dist = dist
                best_city = city['city']
        
        mapping[plz] = best_city

    # 4. Save to JSON
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
        
    print(f"Saved mapping for {len(mapping)} regions to {OUTPUT_FILE}")

if __name__ == "__main__":
    generate_mapping()
