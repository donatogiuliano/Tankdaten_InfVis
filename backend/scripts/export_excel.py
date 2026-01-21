
import pandas as pd
import os
import argparse
import sys

# PATHS
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_DIR = os.path.join(BASE_DIR, 'data')
OUTPUT_DIR = os.path.join(BASE_DIR, 'data', 'excel_exports')

def export_year(year):
    print(f"Exporting data for YEAR: {year}")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    excel_file = os.path.join(OUTPUT_DIR, f'tankdaten_export_{year}.xlsx')
    
    # Files to look for
    files = {
        'Daily': f'data_daily_{year}.parquet',
        'Weekly': f'data_weekly_{year}.parquet',
        'Monthly': f'data_monthly_{year}.parquet'
    }
    
    try:
        with pd.ExcelWriter(excel_file, engine='openpyxl') as writer:
            written_any = False
            for sheet_name, filename in files.items():
                path = os.path.join(INPUT_DIR, filename)
                if os.path.exists(path):
                    print(f"  Loading {filename}...")
                    df = pd.read_parquet(path)
                    
                    # Check limit
                    if len(df) > 1000000:
                        print(f"  WARNING: {filename} has {len(df)} rows, exceeding Excel safe limits. Taking top 1,000,000 rows.")
                        df = df.head(1000000)
                    
                    print(f"  Writing {sheet_name} ({len(df)} rows) to Excel...")
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                    written_any = True
                else:
                    print(f"  Skipping {sheet_name}: File not found ({filename})")
            
            if not written_any:
                print("No data found to export.")
                return

        print(f"Successfully created: {excel_file}")

    except Exception as e:
        print(f"ERROR exporting Excel: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--year', type=int, required=True)
    args = parser.parse_args()
    
    export_year(args.year)
