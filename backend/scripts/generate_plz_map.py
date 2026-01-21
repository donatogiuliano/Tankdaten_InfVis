
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
    
    try:
        df = pd.read_parquet(parquet_path, columns=['region_plz3', 'lat', 'lon'])
    except Exception as e:
        print(f"Column error: {e}")
        # Maybe names are different? Using full read to check
        df = pd.read_parquet(parquet_path)
        if 'lat' not in df.columns:
            print("Lat/Lon not in daily data! Checking if we have a station list...")
            pass

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
