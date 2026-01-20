
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
        year = request.args.get('year', default=2024, type=int)
        file_path = os.path.join(DATA_DIR, f'data_daily_{year}.parquet')
        if not os.path.exists(file_path):
            return jsonify({"error": f"Data for year {year} not found"}), 404
            
        df = pd.read_parquet(file_path)
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/weekly')
def get_weekly_data():
    try:
        year = request.args.get('year', default=2024, type=int)
        file_path = os.path.join(DATA_DIR, f'data_weekly_{year}.parquet')
        if not os.path.exists(file_path):
            return jsonify({"error": f"Data for year {year} not found"}), 404
            
        df = pd.read_parquet(file_path)
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/monthly')
def get_monthly_data():
    try:
        year = request.args.get('year', default=2024, type=int)
        file_path = os.path.join(DATA_DIR, f'data_monthly_{year}.parquet')
        if not os.path.exists(file_path):
            return jsonify({"error": f"Data for year {year} not found"}), 404
            
        df = pd.read_parquet(file_path)
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
        target_year = year if year else 2024
        parquet_file = os.path.join(DATA_DIR, f'data_daily_{target_year}.parquet')
        
        if not os.path.exists(parquet_file):
             return jsonify({"error": f"Data for year {target_year} not found"}), 404
             
        df = pd.read_parquet(parquet_file)
        
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

@app.route('/api/data/corona')
def get_corona_data():
    """Get aggregated 2020 fuel price data for Corona crisis analysis."""
    try:
        file_path = os.path.join(DATA_DIR, 'data_daily_2020.parquet')
        if not os.path.exists(file_path):
            return jsonify({"error": "2020 data not found"}), 404
        
        df = pd.read_parquet(file_path)
        
        # Aggregate by date and fuel type (average across all regions)
        agg = df.groupby(['date', 'fuel']).agg({
            'price_mean': 'mean'
        }).reset_index()
        
        # Convert date to string for JSON
        agg['date'] = agg['date'].dt.strftime('%Y-%m-%d')
        
        return jsonify(agg.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/data/history')
def get_region_history():
    try:
        year = request.args.get('year', type=int)
        plz = request.args.get('plz', type=str) # string to preserve leading zeros if needed
        
        if not plz:
            return jsonify({"error": "Missing PLZ"}), 400

        # Read Data (using daily for granularity, then agg to month)
        df = pd.read_parquet(os.path.join(DATA_DIR, 'data_daily.parquet'))
        
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            if year:
                df = df[df['date'].dt.year == year]
        
        # Filter by Region (PLZ2)
        # Ensure string comparison
        df['region_plz2'] = df['region_plz2'].astype(str)
        df = df[df['region_plz2'] == str(plz)]

        if df.empty:
            return jsonify([])

        # Add Month
        df['month'] = df['date'].dt.month
        
        # Group by Month + Fuel
        agg = df.groupby(['month', 'fuel'])['price_mean'].mean().reset_index()
        
        # Pivot: Index=Month, Cols=Fuel
        pivot = agg.pivot(index='month', columns='fuel', values='price_mean').reset_index()
        
        return jsonify(pivot.to_dict(orient='records'))

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask Server on Port 5000...")
    app.run(debug=True, port=5000, host='0.0.0.0')
