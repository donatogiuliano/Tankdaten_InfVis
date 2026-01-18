
import pandas as pd
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
OUTPUT_FILE = os.path.join(DATA_DIR, 'simulated_data.xlsx')

def export_to_excel():
    print("Reading Parquet files...")
    try:
        daily = pd.read_parquet(os.path.join(DATA_DIR, 'data_daily.parquet'))
        weekly = pd.read_parquet(os.path.join(DATA_DIR, 'data_weekly.parquet'))
        monthly = pd.read_parquet(os.path.join(DATA_DIR, 'data_monthly.parquet'))
        
        print(f"Daily: {len(daily)} rows")
        print(f"Weekly: {len(weekly)} rows")
        print(f"Monthly: {len(monthly)} rows")
        
        print(f"Writing to {OUTPUT_FILE}...")
        with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
            daily.to_excel(writer, sheet_name='Daily', index=False)
            weekly.to_excel(writer, sheet_name='Weekly', index=False)
            monthly.to_excel(writer, sheet_name='Monthly', index=False)
            
        print("Export complete.")
        
    except Exception as e:
        print(f"Error during export: {e}")

if __name__ == "__main__":
    export_to_excel()
