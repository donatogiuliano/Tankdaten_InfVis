import os
import pandas as pd
import sys

# Add script directory to path to import ingest_data
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from ingest_data import fetch_real_macro_data

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')

def enrich_file(filename):
    file_path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    print(f"Loading {filename}...")
    df = pd.read_parquet(file_path)
    
    # Check if we have 'brent_oil_eur' and if it looks fake
    # Or just overwrite it regardless.
    
    # Get Date Range
    dates = pd.to_datetime(df['date'])
    
    # Fetch Real Macro Data covering this range
    # extend range slightly to ensure coverage
    min_date = dates.min() - pd.Timedelta(days=7)
    max_date = dates.max() + pd.Timedelta(days=7)
    date_range = pd.date_range(min_date, max_date)
    
    print(f"Fetching macro data for range {min_date} to {max_date}...")
    try:
        df_macro = fetch_real_macro_data(date_range)
    except Exception:
        import traceback
        traceback.print_exc()
        return
    
    # Prepare for Merge
    # df_macro has 'date', 'brent_oil_usd', 'exchange_rate_eur_usd', 'brent_oil_eur'
    # df has 'date'
    
    # Drop existing macro columns if they exist
    cols_to_drop = ['brent_oil_usd', 'exchange_rate_eur_usd', 'brent_oil_eur']
    df.drop(columns=[c for c in cols_to_drop if c in df.columns], inplace=True)
    
    # Merge
    print("Merging...")
    # Ensure date types match
    df['date'] = pd.to_datetime(df['date'])
    df_macro['date'] = pd.to_datetime(df_macro['date'])
    
    df_enriched = df.merge(df_macro, on='date', how='left')
    
    # Save
    print(f"Saving enriched {filename}...")
    df_enriched.to_parquet(file_path, index=False)
    print("Done.")

if __name__ == "__main__":
    # Enrich 2020 (Corona)
    enrich_file('data_daily_2020.parquet')
    
    # Enrich 2022 (Ukraine Crisis)
    enrich_file('data_daily_2022.parquet')
    enrich_file('data_weekly_2022.parquet')
    enrich_file('data_monthly_2022.parquet')
