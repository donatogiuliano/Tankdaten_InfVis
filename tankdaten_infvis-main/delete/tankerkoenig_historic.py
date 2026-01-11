import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta, timezone

BASE_REPO_PATH = Path(__file__).parent.parent / 'tankerkoenig_historic'
CACHE_DIR = Path(__file__).parent.parent / 'output'
CACHE_DIR.mkdir(exist_ok=True) 

PRICE_COLS = ['date', 'station_uuid', 'diesel', 'e5', 'e10']
STATION_COLS = ['uuid', 'name', 'post_code']

PRICE_NEW_NAMES = {
    'date': 'Datum_Uhrzeit', 
    'station_uuid': 'Stations_ID',
    'diesel': 'Diesel', 
    'e5': 'E5', 
    'e10': 'E10'

}
STATION_NEW_NAMES = {
    'uuid': 'Stations_ID', 
    'name': 'Name',
    'post_code': 'PLZ'
}


def get_tankerkoenig_historic(start_date_str, end_date_str, resolve_uuids=False):
    
    if resolve_uuids:
        suffix = '_uuids_resolved'
    else:
        suffix = '_uuids_unresolved'
    
    cache_file_name = f"cache_{start_date_str}_to_{end_date_str}{suffix}.parquet"
    cache_file_path = CACHE_DIR / cache_file_name

    if cache_file_path.exists():
        return pd.read_parquet(cache_file_path)

    
    user_start = datetime.strptime(start_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
    user_end = datetime.strptime(end_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)

    if user_start > user_end:
        return pd.DataFrame() 

    all_data = []
    current_date = user_start

    while current_date <= user_end:
        date_str = current_date.strftime('%Y-%m-%d')
        year, month = current_date.year, current_date.strftime('%m')
        
        file_name = f'{date_str}-prices.csv'
        file_path = BASE_REPO_PATH / 'prices' / str(year) / str(month) / file_name
        
        if file_path.exists():
            df = pd.read_csv(
                file_path, sep=',', usecols=PRICE_COLS,
                dtype={'station_uuid': 'string'}, parse_dates=['date']
            )
            all_data.append(df)
        
        current_date += timedelta(days=1)

    if not all_data:
        return pd.DataFrame()

    df = pd.concat(all_data, ignore_index=True)
    df = df.rename(columns=PRICE_NEW_NAMES)
    
    if resolve_uuids:
        s_date_str = user_end.strftime('%Y-%m-%d')
        s_year, s_month = user_end.year, user_end.strftime('%m')
        
        s_file_name = f'{s_date_str}-stations.csv'
        s_file_path = BASE_REPO_PATH / 'stations' / str(s_year) / str(s_month) / s_file_name

        if s_file_path.exists():
            station_df = pd.read_csv(
                s_file_path, sep=',', usecols=STATION_COLS,
                dtype={'uuid': 'string', 'name': 'string', 'post_code': 'string'}
            )
            station_df = station_df.rename(columns=STATION_NEW_NAMES)
            
            df = df.merge(station_df, on='Stations_ID', how='left')
    

    df.to_parquet(cache_file_path)
    
    return df