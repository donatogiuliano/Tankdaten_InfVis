"""
Marktphasen-Analyse für Tankpreisdaten

Berechnet zeitliche Marktphasen basierend auf Tank- und Ölpreisdynamik:
- ASYMMETRIE: Tankpreise reagieren nicht synchron auf Ölpreisänderungen
- INTERNE_FAKTOREN: Preisänderungen durch regionale oder interne Faktoren (hohe Volatilität)
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple


def calculate_log_returns(series: pd.Series) -> pd.Series:
    """Berechnet Log-Returns: r[t] = log(p[t]) - log(p[t-1])"""
    return np.log(series) - np.log(series.shift(1))


def smooth_returns(returns: pd.Series, window: int = 7) -> pd.Series:
    """Glättet Returns über rollenden Mittelwert"""
    return returns.rolling(window=window, min_periods=window).mean()


def calculate_zscore(series: pd.Series) -> pd.Series:
    """Normalisiert als Z-Score: z = x / std(x)"""
    std = series.std()
    if std == 0 or pd.isna(std):
        return pd.Series(0, index=series.index)
    return series / std


def calculate_rolling_volatility(returns: pd.Series, window: int = 14) -> pd.Series:
    """Berechnet rollende Volatilität (Standardabweichung)"""
    return returns.rolling(window=window, min_periods=window).std()


def find_best_lag_correlation(
    zp: pd.Series, 
    zo: pd.Series, 
    window: int = 14, 
    max_lag: int = 7
) -> Tuple[pd.Series, pd.Series]:
    """
    Findet für jeden Zeitpunkt den Lag mit maximaler Korrelation.
    Returns: (best_correlation, best_lag)
    """
    n = len(zp)
    best_corr = pd.Series(np.nan, index=zp.index)
    best_lag = pd.Series(np.nan, index=zp.index)
    
    for i in range(window + max_lag, n):
        max_rho = -np.inf
        max_l = 0
        
        for lag in range(0, max_lag + 1):
            # zp[t-13:t] korreliert mit zo[t-13-lag:t-lag]
            zp_window = zp.iloc[i - window + 1:i + 1]
            zo_window = zo.iloc[i - window + 1 - lag:i + 1 - lag]
            
            if len(zp_window) == window and len(zo_window) == window:
                rho = zp_window.corr(zo_window)
                if not pd.isna(rho) and rho > max_rho:
                    max_rho = rho
                    max_l = lag
        
        if max_rho > -np.inf:
            best_corr.iloc[i] = max_rho
            best_lag.iloc[i] = max_l
    
    return best_corr, best_lag


def classify_phase(
    row: pd.Series,
    vp_percentile_80: float,
    vo_percentile_40: float
) -> str:
    """
    Klassifiziert Marktphase basierend auf Metriken.
    Priorität: ASYMMETRIE > INTERNE_FAKTOREN > KEINE
    """
    # Extrahiere Werte
    rho = row.get('best_correlation', np.nan)
    lag = row.get('best_lag', np.nan)
    zp = row.get('zp', np.nan)
    zo_lagged = row.get('zo_lagged', np.nan)
    vp = row.get('vp', np.nan)
    vo = row.get('vo', np.nan)
    vol_ratio = row.get('vol_ratio', np.nan)
    
    # Prüfe auf fehlende Werte
    if pd.isna(vp) or pd.isna(vo):
        return 'KEINE'
    
    # 0. Sicherheits-Check Korrelation
    if pd.isna(rho):
        rho = 0
    
    # 1. ASYMMETRIE
    if not pd.isna(zp) and not pd.isna(zo_lagged):
        diff = zp - zo_lagged
        if abs(diff) >= 1.3:  # Höhere Schwelle für weniger Rauschen
            return 'ASYMMETRIE'
    
    # 2. INTERNE_FAKTOREN 
    # Wenn die Korrelation sinkt UND der Tankpreis springt (oder Öl stabil ist)
    if rho < 0.5:
        if vol_ratio >= 2.0 or (vp >= vp_percentile_80 and vo <= vo_percentile_40):
            return 'INTERNE_FAKTOREN'
    
    return 'KEINE'


def group_phases_to_intervals(df: pd.DataFrame) -> List[Dict]:
    """Gruppiert aufeinanderfolgende Tage gleicher Phase zu Intervallen"""
    if df.empty or 'phase' not in df.columns:
        return []
    
    intervals = []
    current_phase = None
    start_date = None
    end_date = None
    metrics_sum = {'correlation': 0, 'lag': 0, 'vol_ratio': 0}
    count = 0
    
    for idx, row in df.iterrows():
        date = row['date']
        phase = row['phase']
        
        if phase != current_phase:
            # Speichere vorheriges Intervall
            if current_phase is not None and current_phase != 'KEINE':
                intervals.append({
                    'phase': current_phase,
                    'start_date': start_date.strftime('%Y-%m-%d') if hasattr(start_date, 'strftime') else str(start_date),
                    'end_date': end_date.strftime('%Y-%m-%d') if hasattr(end_date, 'strftime') else str(end_date),
                    'duration_days': count,
                    'avg_correlation': metrics_sum['correlation'] / max(count, 1),
                    'avg_lag': metrics_sum['lag'] / max(count, 1),
                    'avg_vol_ratio': metrics_sum['vol_ratio'] / max(count, 1)
                })
            
            # Starte neues Intervall
            current_phase = phase
            start_date = date
            end_date = date
            metrics_sum = {'correlation': 0, 'lag': 0, 'vol_ratio': 0}
            count = 0
        
        end_date = date
        count += 1
        
        # Sammle Metriken
        if not pd.isna(row.get('best_correlation')):
            metrics_sum['correlation'] += row.get('best_correlation', 0)
        if not pd.isna(row.get('best_lag')):
            metrics_sum['lag'] += row.get('best_lag', 0)
        if not pd.isna(row.get('vol_ratio')):
            metrics_sum['vol_ratio'] += row.get('vol_ratio', 0)
    
    # Letztes Intervall
    if current_phase is not None and current_phase != 'KEINE':
        intervals.append({
            'phase': current_phase,
            'start_date': start_date.strftime('%Y-%m-%d') if hasattr(start_date, 'strftime') else str(start_date),
            'end_date': end_date.strftime('%Y-%m-%d') if hasattr(end_date, 'strftime') else str(end_date),
            'duration_days': count,
            'avg_correlation': metrics_sum['correlation'] / max(count, 1),
            'avg_lag': metrics_sum['lag'] / max(count, 1),
            'avg_vol_ratio': metrics_sum['vol_ratio'] / max(count, 1)
        })
    
    return intervals


def merge_close_intervals(intervals: List[Dict], max_gap: int = 1) -> List[Dict]:
    """Fusioniert Intervalle gleicher Phase, deren Abstand <= max_gap Tage beträgt"""
    if len(intervals) < 2:
        return intervals
    
    merged = []
    current = intervals[0].copy()
    
    for i in range(1, len(intervals)):
        next_interval = intervals[i]
        
        if next_interval['phase'] == current['phase']:
            # Berechne Abstand
            current_end = pd.to_datetime(current['end_date'])
            next_start = pd.to_datetime(next_interval['start_date'])
            gap = (next_start - current_end).days
            
            if gap <= max_gap + 1:  # +1 weil end_date inklusive
                # Fusionieren
                current['end_date'] = next_interval['end_date']
                total_days = current['duration_days'] + next_interval['duration_days']
                # Gewichteter Durchschnitt der Metriken
                w1 = current['duration_days']
                w2 = next_interval['duration_days']
                current['avg_correlation'] = (current['avg_correlation'] * w1 + next_interval['avg_correlation'] * w2) / total_days
                current['avg_lag'] = (current['avg_lag'] * w1 + next_interval['avg_lag'] * w2) / total_days
                current['avg_vol_ratio'] = (current['avg_vol_ratio'] * w1 + next_interval['avg_vol_ratio'] * w2) / total_days
                current['duration_days'] = total_days
                continue
        
        merged.append(current)
        current = next_interval.copy()
    
    merged.append(current)
    return merged


def filter_short_intervals(intervals: List[Dict], min_days: int = 5) -> List[Dict]:
    """Entfernt Intervalle mit Dauer < min_days"""
    return [i for i in intervals if i['duration_days'] >= min_days]


def calculate_market_phases(
    df: pd.DataFrame,
    fuel: str = 'e10',
    region: Optional[str] = None
) -> Dict:
    """
    Hauptfunktion: Berechnet Marktphasen für gegebene Daten.
    
    Args:
        df: DataFrame mit date, fuel, price_mean, brent_oil_eur
        fuel: Kraftstoffart (e5, e10, diesel)
        region: Optional PLZ3-Region
    
    Returns:
        Dict mit timeseries, phases, meta
    """
    # 1. Daten filtern
    filtered = df[df['fuel'] == fuel].copy()
    if region:
        filtered = filtered[filtered['region_plz3'] == region]
    
    # Aggregiere nach Datum (Durchschnitt über Regionen)
    daily = filtered.groupby('date').agg({
        'price_mean': 'mean',
        'brent_oil_eur': 'first',
        'price_std': 'mean'
    }).reset_index()
    
    daily = daily.sort_values('date').reset_index(drop=True)
    
    # Prüfe Mindestdaten
    if len(daily) < 14:
        return {
            'timeseries': daily.to_dict(orient='records'),
            'phases': [],
            'meta': {'oil_available': False, 'error': 'Weniger als 14 Tage Daten'}
        }
    
    # Prüfe Ölpreise
    oil_available = 'brent_oil_eur' in daily.columns and daily['brent_oil_eur'].notna().any()
    
    if not oil_available:
        return {
            'timeseries': daily.to_dict(orient='records'),
            'phases': [],
            'meta': {'oil_available': False, 'error': 'Keine Ölpreisdaten verfügbar'}
        }
    
    # 2. Log-Returns berechnen
    daily['rp'] = calculate_log_returns(daily['price_mean'])
    daily['ro'] = calculate_log_returns(daily['brent_oil_eur'])
    
    # 3. Glätten (7 Tage)
    daily['rp_smooth'] = smooth_returns(daily['rp'], window=7)
    daily['ro_smooth'] = smooth_returns(daily['ro'], window=7)
    
    # 4. Z-Scores
    daily['zp'] = calculate_zscore(daily['rp_smooth'])
    daily['zo'] = calculate_zscore(daily['ro_smooth'])
    
    # 5. Rollende Volatilität (14 Tage)
    daily['vp'] = calculate_rolling_volatility(daily['rp'], window=14)
    daily['vo'] = calculate_rolling_volatility(daily['ro'], window=14)
    daily['vol_ratio'] = daily['vp'] / (daily['vo'] + 0.0001)
    
    # 6. Lag-Korrelation
    best_corr, best_lag = find_best_lag_correlation(daily['zp'], daily['zo'], window=14, max_lag=7)
    daily['best_correlation'] = best_corr
    daily['best_lag'] = best_lag
    
    # Berechne zo_lagged basierend auf bestem Lag
    daily['zo_lagged'] = daily.apply(
        lambda row: daily['zo'].shift(int(row['best_lag'])).loc[row.name] 
        if not pd.isna(row['best_lag']) else np.nan,
        axis=1
    )
    
    # 7. Perzentile für Klassifikation
    vp_p80 = daily['vp'].quantile(0.80)
    vo_p40 = daily['vo'].quantile(0.40)
    
    # 8. Phasenklassifikation
    daily['phase'] = daily.apply(
        lambda row: classify_phase(row, vp_p80, vo_p40),
        axis=1
    )
    
    # 9. Intervalle erstellen
    intervals = group_phases_to_intervals(daily)
    
    # 10. Fusionieren (Abstand ≤ 2 Tage für aggressiveres Merging)
    intervals = merge_close_intervals(intervals, max_gap=2)
    
    # 11. Kurze Intervalle entfernen (< 5 Tage)
    intervals = filter_short_intervals(intervals, min_days=5)
    
    # 12. 7-Tage gleitenden Durchschnitt für Visualisierung berechnen
    daily['price_ma7'] = daily['price_mean'].rolling(window=7, min_periods=1).mean()
    
    # 13. Aufbereiten für JSON-Response
    timeseries = daily[['date', 'price_mean', 'price_std', 'price_ma7', 'brent_oil_eur', 'phase', 'vp', 'vo', 'vol_ratio', 'best_correlation', 'best_lag']].copy()
    timeseries['date'] = timeseries['date'].astype(str)
    
    # NaN durch None ersetzen für JSON
    timeseries = timeseries.replace({np.nan: None})
    
    return {
        'timeseries': timeseries.to_dict(orient='records'),
        'phases': intervals,
        'meta': {
            'oil_available': True,
            'n_days': len(daily),
            'vp_percentile_80': float(vp_p80) if not pd.isna(vp_p80) else None,
            'vo_percentile_40': float(vo_p40) if not pd.isna(vo_p40) else None
        }
    }
