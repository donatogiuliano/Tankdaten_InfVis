
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import pandas as pd
import os
import glob
import json

app = Flask(__name__, static_folder="../frontend", static_url_path="/")
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/data/daily')
def get_daily_data():
    try:
        df = pd.read_parquet(os.path.join(DATA_DIR, 'data_daily.parquet'))
        # Limit for performance if needed, or aggregate
        # For charts, we might want full history or filtered
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/weekly')
def get_weekly_data():
    try:
        df = pd.read_parquet(os.path.join(DATA_DIR, 'data_weekly.parquet'))
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/monthly')
def get_monthly_data():
    try:
        df = pd.read_parquet(os.path.join(DATA_DIR, 'data_monthly.parquet'))
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/regional')
def get_regional_data():
    try:
        year = request.args.get('year', type=int)
        
        # 1. Try Cache First (Mega Efficient)
        if year:
            cache_file = os.path.join(DATA_DIR, 'cache', f'regional_{year}.json')
            if os.path.exists(cache_file):
                print(f"Serving from cache: {cache_file}")
                # We can just return the file content
                with open(cache_file, 'r') as f:
                    return jsonify(json.load(f))

        # 2. Fallback: Slow Calculation
        print("Cache miss or no year, calculating...")
        df = pd.read_parquet(os.path.join(DATA_DIR, 'data_daily.parquet'))
        
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            if year:
                df = df[df['date'].dt.year == year]
            else:
                max_date = df['date'].max()
                start_date = max_date - pd.Timedelta(days=30)
                df = df[df['date'] >= start_date]

        # Aggregate Long Format -> Wide
        if 'period' in df.columns: # Sometimes aggregated? No, assuming raw
             pass

        # Group by Region + Fuel first
        agg = df.groupby(['region_plz2', 'fuel'])['price_mean'].mean().reset_index()
        
        # Pivot
        pivot = agg.pivot(index='region_plz2', columns='fuel', values='price_mean').reset_index()
        
        # Ensure cols
        for col in ['e5', 'e10', 'diesel']:
            if col not in pivot.columns:
                pivot[col] = None
                
        return jsonify(pivot.to_dict(orient='records'))

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/geo/states')
def get_states_geo():
    try:
        geo_dir = os.path.join(DATA_DIR, 'geometries')
        return send_from_directory(geo_dir, 'states.geojson')
    except Exception as e:
        return jsonify({"error": str(e)}), 404

if __name__ == '__main__':
    print("Starting Flask Server on Port 5000...")
    app.run(debug=True, port=5000, host='0.0.0.0')
