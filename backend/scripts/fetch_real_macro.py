import os
import pandas as pd
import requests
import xml.etree.ElementTree as ET
from typing import Optional

# Configuration
OIL_URL = "https://www.eia.gov/dnav/pet/hist_xls/RBRTEd.xls"
ECB_URL = "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/usd.xml"

def get_oil_prices(cache_path: Optional[str] = None) -> pd.DataFrame:
    print(f"Fetching Oil Prices from {OIL_URL}...")
    try:
        df = pd.read_excel(OIL_URL, sheet_name="Data 1", skiprows=2, engine="xlrd")
    except Exception as e:
        raise RuntimeError(f"Oil data could not be loaded: {e}")

    df.columns = ["Date", "Price"]
    df = df.dropna(subset=["Date", "Price"])

    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df.dropna(subset=["Date"])
    df.rename(columns={"Price": "brent_oil_usd"}, inplace=True)
    return df

def get_ecb_values():
    print(f"Fetching Exchange Rates from {ECB_URL}...")
    try:
        response = requests.get(ECB_URL)
        response.raise_for_status()
    except Exception as e:
        raise RuntimeError(f"Error loading ECB data: {e}")

    try:
        root = ET.fromstring(response.content)

        records = []

        for obs in root.iter():
            if obs.tag.endswith("Obs"):
                date_str = obs.attrib.get("TIME_PERIOD")
                value_str = obs.attrib.get("OBS_VALUE")

                if date_str and value_str:
                    try:
                        date = pd.to_datetime(date_str, errors="coerce")
                        value = float(value_str)
                        if pd.notna(date):
                            records.append({
                                "Date": date,
                                "USD_per_EUR": value
                            })
                    except ValueError:
                        continue

        df = pd.DataFrame(records, columns=["Date", "USD_per_EUR"])
        df["USD_per_EUR"] = df["USD_per_EUR"].astype("float64")
        df.rename(columns={"USD_per_EUR": "exchange_rate_eur_usd"}, inplace=True)

        return df

    except Exception as e:
        raise RuntimeError(f"Error processing XML data: {e}")

if __name__ == "__main__":
    try:
        # Fetch Oil
        df_oil = get_oil_prices()
        print("\n--- Brent Oil Data (USD) ---")
        print(df_oil.head())
        print(f"Count: {len(df_oil)}")

        # Fetch FX
        df_fx = get_ecb_values()
        print("\n--- ECB Exchange Rate (USD/EUR) ---")
        print(df_fx.head())
        print(f"Count: {len(df_fx)}")

        # Merge check (Validation)
        print("\n--- Merging Data ---")
        merged = pd.merge(df_oil, df_fx, on="Date", how="inner")
        merged["brent_oil_eur"] = merged["brent_oil_usd"] / merged["exchange_rate_eur_usd"]
        
        print(merged.tail())
        print(f"Merged Data Count: {len(merged)}")
        
        # Check 2020 specifically
        merged_2020 = merged[merged['Date'].dt.year == 2020]
        print(f"\n2020 Data Points: {len(merged_2020)}")
        if not merged_2020.empty:
             print("Min Oil Price (EUR) in 2020:", merged_2020['brent_oil_eur'].min())

    except Exception as e:
        print(f"\nERROR: {e}")
