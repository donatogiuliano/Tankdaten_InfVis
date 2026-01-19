import pandas as pd
import os

# Pfade
# Pfade
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
OUTPUT_FILE = os.path.join(DATA_DIR, 'data_2024.xlsx')

print("Lese Parquet Dateien...")
daily = pd.read_parquet(os.path.join(DATA_DIR, 'data_daily.parquet'))
weekly = pd.read_parquet(os.path.join(DATA_DIR, 'data_weekly.parquet'))
monthly = pd.read_parquet(os.path.join(DATA_DIR, 'data_monthly.parquet'))

print(f"Schreibe Excel nach: {OUTPUT_FILE} ...")
# Benutze ExcelWriter um mehrere Sheets zu schreiben
with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
    daily.to_excel(writer, sheet_name='Daily', index=False)
    weekly.to_excel(writer, sheet_name='Weekly', index=False)
    monthly.to_excel(writer, sheet_name='Monthly', index=False)

print("Fertig! ✅")
