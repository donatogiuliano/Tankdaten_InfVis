import pandas as pd
import os

data_dir = r"c:\Users\selcuk\Downloads\tankdaten_infvis-main(1)\tankdaten_infvis-main\backend\data"

files = {
    'daily': 'data_daily_2022.parquet',
    'weekly': 'data_weekly_2022.parquet',
    'monthly': 'data_monthly_2022.parquet'
}

for freq, filename in files.items():
    path = os.path.join(data_dir, filename)
    print(f"\n--- {freq.upper()} DATA ({filename}) ---")
    if os.path.exists(path):
        df = pd.read_parquet(path)
        print("Columns:", df.columns.tolist())
        print("Shape:", df.shape)
        print("Head (3):")
        print(df.head(3))
        
        # Check specific date ranges for Ukraine war start (Feb 24, 2022)
        if 'date' in df.columns:
            print("\nDate Range:", df['date'].min(), "to", df['date'].max())
            
        # Check max price to see the shock
        if 'price_mean' in df.columns:
            max_price_row = df.loc[df['price_mean'].idxmax()]
            print("\nMax Price Record:")
            print(max_price_row)
    else:
        print(f"File not found: {path}")
