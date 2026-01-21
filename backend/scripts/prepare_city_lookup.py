"""
Generate city_lookup.json with REAL city names via Nominatim.
This script runs ONCE during setup, not at runtime.
The resulting JSON is cached for fast frontend lookups.
"""
import json
import time
import requests
from pathlib import Path

def reverse_geocode(lat, lon):
    """Get city name from Nominatim."""
    try:
        url = f"https://nominatim.openstreetmap.org/reverse"
        params = {
            'lat': lat,
            'lon': lon,
            'format': 'json',
            'zoom': 10,
            'accept-language': 'de'
        }
        headers = {'User-Agent': 'TankdatenVis/1.0 (setup script)'}
        res = requests.get(url, params=params, headers=headers, timeout=10)
        data = res.json()
        addr = data.get('address', {})
        name = addr.get('city') or addr.get('town') or addr.get('village') or addr.get('municipality') or addr.get('county')
        return name
    except Exception as e:
        print(f"Error at {lat},{lon}: {e}")
        return None

def main():
    base_dir = Path(__file__).parent.parent / 'data' / 'cache'
    base_dir.mkdir(exist_ok=True)
    output_file = base_dir / 'city_lookup.json'
    
    city_lookup = {}

    coarse_lookup = {}
    
    print("Fetching city names from Nominatim (0.5 degree grid)...")
    total = 0
    for lat_int in range(470, 556, 5):  
        lat = lat_int / 10.0
        for lon_int in range(60, 156, 5): 
            lon = lon_int / 10.0
            
            name = reverse_geocode(lat, lon)
            if name:
                coarse_lookup[(lat, lon)] = name
                print(f"  {lat:.1f}, {lon:.1f} -> {name}")
            else:
                print(f"  {lat:.1f}, {lon:.1f} -> (no data)")
            
            total += 1
            time.sleep(1.0)
    
    print(f"\nFetched {len(coarse_lookup)} cities from {total} grid points")
    
    print("Interpolating to 0.1 degree grid...")
    for lat_int in range(470, 556): 
        lat = lat_int / 10.0
        for lon_int in range(60, 156):
            lon = lon_int / 10.0
            
            nearest_lat = round(lat * 2) / 2 
            nearest_lon = round(lon * 2) / 2
            
            key = f"{lat:.1f}_{lon:.1f}"
            if (nearest_lat, nearest_lon) in coarse_lookup:
                city_lookup[key] = coarse_lookup[(nearest_lat, nearest_lon)]
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(city_lookup, f, ensure_ascii=False)
    
    print(f"Saved {len(city_lookup)} grid cells to {output_file}")

if __name__ == '__main__':
    main()
