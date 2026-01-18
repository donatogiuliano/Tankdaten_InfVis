"""
Datenvorbereitungs-Script für Tankpreis Dashboard
Aggregiert 2024 Preisdaten für HeatMap und Map Visualisierungen
"""

import os
import json
import pandas as pd
from pathlib import Path
from datetime import datetime

# Pfade konfigurieren
BASE_DIR = Path(__file__).parent.parent
DATA_INPUT = BASE_DIR / "tankdaten_infvis" / "tankdaten_infvis-main" / "data" / "input"
DATA_OUTPUT = BASE_DIR / "frontend" / "data"

# Sicherstellen, dass Output-Ordner existiert
DATA_OUTPUT.mkdir(parents=True, exist_ok=True)

def load_stations_data():
    """Lädt Tankstellen-Stammdaten aus einer Beispieldatei"""
    stations_file = DATA_INPUT / "stations" / "2024" / "01" / "2024-01-01-stations.csv"
    
    if not stations_file.exists():
        print(f"Stations-Datei nicht gefunden: {stations_file}")
        return pd.DataFrame()
    
    print(f"Lade Stationsdaten aus {stations_file}...")
    df = pd.read_csv(stations_file, low_memory=False)
    
    # Relevante Spalten auswählen
    columns = ['uuid', 'name', 'city', 'latitude', 'longitude', 'brand']
    df = df[[c for c in columns if c in df.columns]]
    
    return df

def load_price_data_sample():
    """Lädt eine Stichprobe der Preisdaten für 2024 (Januar als Beispiel)"""
    prices_dir = DATA_INPUT / "prices" / "2024"
    
    if not prices_dir.exists():
        print(f"Preisverzeichnis nicht gefunden: {prices_dir}")
        return pd.DataFrame()
    
    all_prices = []
    
    # Lade nur Januar-Daten als Sample (für schnellere Verarbeitung)
    months_to_load = ["01"]  # Kann auf ["01", "02", ..., "12"] erweitert werden
    
    for month in months_to_load:
        month_dir = prices_dir / month
        if not month_dir.exists():
            continue
            
        files = sorted(month_dir.glob("*.csv"))
        
        # Sample: Jeden 7. Tag laden
        sample_files = files[::7]
        
        for f in sample_files:
            print(f"Lade {f.name}...")
            try:
                df = pd.read_csv(f, low_memory=False)
                all_prices.append(df)
            except Exception as e:
                print(f"Fehler beim Laden von {f}: {e}")
    
    if not all_prices:
        return pd.DataFrame()
    
    return pd.concat(all_prices, ignore_index=True)

def prepare_stuttgart_heatmap(prices_df, stations_df, fuel_type='e10'):
    """Bereitet HeatMap-Daten für Stuttgart vor"""
    print(f"\nErstelle Stuttgart HeatMap für {fuel_type}...")
    
    # Stuttgart-Tankstellen filtern
    stuttgart_stations = stations_df[
        stations_df['city'].str.contains('Stuttgart', case=False, na=False)
    ].copy()
    
    print(f"  Gefunden: {len(stuttgart_stations)} Tankstellen in Stuttgart")
    
    if stuttgart_stations.empty:
        return []
    
    # Preise mit Stationen joinen
    merged = prices_df.merge(
        stuttgart_stations[['uuid', 'name']], 
        left_on='station_uuid', 
        right_on='uuid',
        how='inner'
    )
    
    if merged.empty:
        print("  Keine Preisdaten für Stuttgart gefunden")
        return []
    
    # Stunde aus Datum extrahieren
    merged['datetime'] = pd.to_datetime(merged['date'], errors='coerce')
    merged['hour'] = merged['datetime'].dt.hour
    
    # Preisspalte auswählen
    price_col = fuel_type
    if price_col not in merged.columns:
        print(f"  Spalte {price_col} nicht gefunden")
        return []
    
    # Durchschnittspreis pro Station und Stunde berechnen
    grouped = merged.groupby(['name', 'hour'])[price_col].mean().reset_index()
    grouped.columns = ['station_name', 'hour', 'price']
    
    # Ungültige Preise filtern (0 oder sehr hohe Werte)
    grouped = grouped[(grouped['price'] > 0) & (grouped['price'] < 5)]
    
    # Top 20 Stationen nach Datenqualität
    station_counts = grouped.groupby('station_name').size()
    top_stations = station_counts.nlargest(20).index.tolist()
    grouped = grouped[grouped['station_name'].isin(top_stations)]
    
    print(f"  Erstellt: {len(grouped)} Datenpunkte für {len(top_stations)} Stationen")
    
    return grouped.to_dict('records')

def prepare_bw_map(prices_df, stations_df, fuel_type='e10'):
    """Bereitet Map-Daten für Baden-Württemberg vor"""
    print(f"\nErstelle BW Map für {fuel_type}...")
    
    # Baden-Württemberg PLZ-Bereiche (7xxxx, 88xxx, 89xxx)
    bw_stations = stations_df[
        (stations_df['latitude'].between(47.5, 49.8)) &
        (stations_df['longitude'].between(7.5, 10.5))
    ].copy()
    
    print(f"  Gefunden: {len(bw_stations)} Tankstellen in BW-Region")
    
    if bw_stations.empty:
        return []
    
    # Durchschnittspreis pro Station berechnen
    price_col = fuel_type
    if price_col not in prices_df.columns:
        return []
    
    avg_prices = prices_df.groupby('station_uuid')[price_col].mean().reset_index()
    avg_prices.columns = ['uuid', 'price']
    
    # Mit Stationen joinen
    merged = bw_stations.merge(avg_prices, on='uuid', how='inner')
    
    # Ungültige filtern
    merged = merged[(merged['price'] > 0) & (merged['price'] < 5)]
    
    # Ausgabeformat
    result = merged[['name', 'city', 'latitude', 'longitude', 'price']].copy()
    result.columns = ['station_name', 'city', 'latitude', 'longitude', 'price']
    
    # Auf max 500 Stationen limitieren für Performance
    if len(result) > 500:
        result = result.sample(500, random_state=42)
    
    print(f"  Erstellt: {len(result)} Stationen für Map")
    
    return result.to_dict('records')

def main():
    print("=" * 50)
    print("Tankpreis Dashboard - Datenaufbereitung")
    print("=" * 50)
    
    # Daten laden
    stations_df = load_stations_data()
    prices_df = load_price_data_sample()
    
    if stations_df.empty or prices_df.empty:
        print("\nFehler: Keine Daten gefunden!")
        print(f"Bitte prüfen Sie, ob die Daten unter {DATA_INPUT} vorhanden sind.")
        return
    
    print(f"\nGeladene Daten:")
    print(f"  Stationen: {len(stations_df)}")
    print(f"  Preisdatensätze: {len(prices_df)}")
    
    # Für jeden Kraftstofftyp verarbeiten
    for fuel in ['e10', 'e5', 'diesel']:
        # Stuttgart HeatMap
        heatmap_data = prepare_stuttgart_heatmap(prices_df, stations_df, fuel)
        if heatmap_data:
            output_file = DATA_OUTPUT / f"stuttgart_heatmap_{fuel}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(heatmap_data, f, ensure_ascii=False, indent=2)
            print(f"  Gespeichert: {output_file}")
        
        # BW Map
        map_data = prepare_bw_map(prices_df, stations_df, fuel)
        if map_data:
            output_file = DATA_OUTPUT / f"bw_map_{fuel}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(map_data, f, ensure_ascii=False, indent=2)
            print(f"  Gespeichert: {output_file}")
    
    print("\n" + "=" * 50)
    print("Datenaufbereitung abgeschlossen!")
    print(f"Output-Verzeichnis: {DATA_OUTPUT}")
    print("=" * 50)

if __name__ == "__main__":
    main()
