import os
import sys
import pandas as pd
import traceback

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from ingest_data import fetch_real_macro_data

try:
    print("Testing fetch_real_macro_data...")
    rng = pd.date_range("2020-01-01", "2020-01-10")
    print(f"Range: {rng}")
    df = fetch_real_macro_data(rng)
    print("Success!")
    print(df.head())
except Exception:
    traceback.print_exc()
