"""
Cache-Generator für Marktphasen-Daten

Erstellt vorab-berechnete JSON-Dateien für alle Kraftstoffarten,
um die Ladezeiten im Frontend drastisch zu reduzieren.
"""

import os
import sys
import json

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from market_phases import calculate_market_phases

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
CACHE_DIR = os.path.join(DATA_DIR, 'cache')

def generate_market_phases_cache():
    """Generiert Cache-Dateien für alle Kraftstoffarten."""
    
    print("=" * 50)
    print("Marktphasen Cache Generator")
    print("=" * 50)
    
    # Ensure cache directory exists
    os.makedirs(CACHE_DIR, exist_ok=True)
    
    # Load all years (2019-2024)
    years = [2019, 2020, 2021, 2022, 2023, 2024]
    dfs = []
    
    print("\n📂 Lade Parquet-Dateien...")
    for year in years:
        file_path = os.path.join(DATA_DIR, f'data_daily_{year}.parquet')
        if os.path.exists(file_path):
            print(f"  ✓ {year}")
            df_year = pd.read_parquet(file_path)
            dfs.append(df_year)
        else:
            print(f"  ✗ {year} (nicht gefunden)")
    
    if not dfs:
        print("\n❌ Keine Daten gefunden!")
        return
    
    # Combine all years
    df = pd.concat(dfs, ignore_index=True)
    print(f"\n📊 Gesamtdaten: {len(df):,} Zeilen")
    
    # Generate cache for each fuel type (Germany-wide, no region filter)
    fuel_types = ['e5', 'e10', 'diesel']
    
    print("\n🔄 Berechne Marktphasen...")
    for fuel in fuel_types:
        print(f"\n  Kraftstoff: {fuel.upper()}")
        
        try:
            # Calculate market phases (no region = Germany-wide)
            result = calculate_market_phases(df, fuel=fuel, region=None)
            
            # Save to cache
            cache_file = os.path.join(CACHE_DIR, f'market_phases_{fuel}.json')
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False)
            
            # Stats
            n_days = result.get('meta', {}).get('n_days', 0)
            n_phases = len(result.get('phases', []))
            file_size = os.path.getsize(cache_file) / 1024  # KB
            
            print(f"    ✓ {n_days} Tage, {n_phases} Phasen")
            print(f"    💾 Gespeichert: {cache_file} ({file_size:.1f} KB)")
            
        except Exception as e:
            print(f"    ❌ Fehler: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Cache-Generierung abgeschlossen!")
    print("=" * 50)


if __name__ == '__main__':
    generate_market_phases_cache()
