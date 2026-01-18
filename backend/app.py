
from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

# Cache DataFrames in memory
CACHE = {}

def load_data():
    print("Loading Parquet files into memory...")
    try:
        CACHE['daily'] = pd.read_parquet(os.path.join(DATA_DIR, 'data_daily.parquet'))
        CACHE['weekly'] = pd.read_parquet(os.path.join(DATA_DIR, 'data_weekly.parquet'))
        CACHE['monthly'] = pd.read_parquet(os.path.join(DATA_DIR, 'data_monthly.parquet'))
        CACHE['map'] = pd.read_parquet(os.path.join(DATA_DIR, 'data_map_snapshot.parquet'))
        # Ensure dates are strings for JSON
        CACHE['daily']['date'] = CACHE['daily']['date'].dt.strftime('%Y-%m-%d')
        print("Data loaded successfully.")
    except Exception as e:
        print(f"Error loading data: {e}")

load_data()

@app.route('/api/trends', methods=['GET'])
def get_trends():
    """
    Returns daily trend data.
    If no region specified, aggregates ALL regions to get state-wide average.
    """
    fuel = request.args.get('fuel', 'e10')
    region = request.args.get('region', None)
    
    df = CACHE.get('daily')
    if df is None: return jsonify([]), 404
    
    # Filter Fuel
    df_filtered = df[df['fuel'] == fuel]
    
    if region:
        # Specific Region
        df_filtered = df_filtered[df_filtered['region_plz2'] == region]
    else:
        # Aggregation: State-wide Average per Day
        # Group by Date and calculate mean of means
        df_filtered = df_filtered.groupby('date').agg({
            'price_mean': 'mean',
            'price_min': 'min',
            'price_max': 'max',
            'price_std': 'mean', # Avg volatility
            'ma_7d': 'mean' 
        }).reset_index()
        
    return jsonify(df_filtered.to_dict(orient='records'))

@app.route('/api/crisis', methods=['GET'])
def get_crisis():
    # Same as trends for now, frontend uses specific annotations
    return get_trends()

@app.route('/api/regional', methods=['GET'])
def get_regional():
    """Returns ranking data (latest available monthly or weekly data)."""
    fuel = request.args.get('fuel', 'e10')
    
    # Use Weekly data for ranking
    df = CACHE.get('weekly')
    if df is None: return jsonify([]), 404
    
    df = df[df['fuel'] == fuel]
    
    # Get latest week only
    latest_week = df['year_week'].max()
    df_latest = df[df['year_week'] == latest_week].copy()
    
    # Rename for frontend compatibility (BarChart expects 'name')
    df_latest['name'] = "PLZ " + df_latest['region_plz2']
    
    return jsonify(df_latest.to_dict(orient='records'))

@app.route('/api/map', methods=['GET'])
def get_map():
    """Returns data for the map (latest snapshot)."""
    fuel = request.args.get('fuel', 'e10')
    df = CACHE.get('map')
    if df is None: return jsonify([]), 404
    
    df = df[df['fuel'] == fuel]
    return jsonify(df.to_dict(orient='records'))

@app.route('/api/heatmap', methods=['GET'])
def get_heatmap():
    # Simulated for now (backend aggregation of hourly not implemented in generate_data yet)
    # Using generic pattern
    data = []
    days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
    for day_idx, day in enumerate(days):
        for hour in range(24):
            base = 1.70
            hour_factor = 0.05 if (7 <= hour <= 9) or (16 <= hour <= 18) else -0.02
            price = base + hour_factor
            data.append({'day': day, 'hour': hour, 'price': round(price, 3)})
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
