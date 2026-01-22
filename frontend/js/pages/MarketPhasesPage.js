import { MarketPhasesChart } from '../components/MarketPhasesChart.js';
import { state } from '../state.js';

export class MarketPhasesPage {
    constructor() {
        this.container = null;
        this.data = null;
        this.meta = null;
        this.metaData = null;
        this.chart = null;

        // Default State
        this.state = {
            fuel: state.get('fuelType') || 'e10',
            region: '',
            showOil: true,           // Standardmäßig an
            // Phase Toggles
            showPhaseAsymmetrie: true,
            showPhaseVolatility: true,
            showBand: true           // Standardmäßig an
        };

        this.colors = {
            phase: {
                'ASYMMETRIE': '#FFB74D',           // Hellorange - Spannung
                'INTERNE_FAKTOREN': '#9575CD',  // Sanftes Violett - Interne Faktoren
                'KEINE': 'transparent'
            },
            fuel: '#1e88e5',                   // Kräftiges Blau
            oil: '#2c3e50',                    // Dunkles Marineblau
            band: 'rgba(30, 136, 229, 0.12)'   // Dezenteres Blau
        };
    }

    async render(container) {
        this.container = container;
        // Sync state from global
        this.state.fuel = state.get('fuelType') || 'e10';

        this.container.innerHTML = `
            <div class="page-layout">
                
                <!-- Header -->
                <div style="margin-bottom: 1rem;">
                    <h1 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.8rem;">📊</span> Markttrends (2020-2024)
                    </h1>
                </div>

                <!-- Controls -->
                <div class="controls-row">
                    
                    <!-- Kraftstoff -->
                    <div class="button-group fuel-toggle-group">
                        <button class="btn-group-item ${this.state.fuel === 'e5' ? 'active' : ''}" data-value="e5">Super E5</button>
                        <button class="btn-group-item ${this.state.fuel === 'e10' ? 'active' : ''}" data-value="e10">E10</button>
                        <button class="btn-group-item ${this.state.fuel === 'diesel' ? 'active' : ''}" data-value="diesel">Diesel</button>
                    </div>
                    


                    <!-- Stadt / Region -->
                    <div class="control-group">
                         <input type="text" id="mp-city-input" placeholder="Stadt eingeben..." value="Stuttgart" 
                                style="padding: 6px 10px; border: 1px solid var(--border-strong); border-radius: 4px; font-family: inherit; width: 140px;">
                    </div>

                    <div style="width: 1px; height: 30px; background: var(--border-subtle); margin: 0 0.5rem;"></div>

                    <!-- Phasen anzeigen -->
                    <div style="display: flex; gap: 1rem; align-items: center; font-size: 0.9rem;">
                        <span style="font-weight: 600; color: var(--text-secondary);">Phasen:</span>
                        
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="mp-toggle-p-asymmetrie" checked>
                            <span style="width: 10px; height: 10px; background: ${this.colors.phase['ASYMMETRIE']}; border: 1px solid #ccc; display: inline-block; border-radius: 2px;"></span>
                            Asymmetrie
                        </label>

                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="mp-toggle-p-volatility" checked>
                            <span style="width: 10px; height: 10px; background: ${this.colors.phase['INTERNE_FAKTOREN']}; border: 1px solid #ccc; display: inline-block; border-radius: 2px;"></span>
                            Interne Faktoren
                        </label>
                    </div>

                    <div style="width: 1px; height: 30px; background: var(--border-subtle); margin: 0 0.5rem;"></div>

                    <!-- Ölpreis & Vol.-Band -->
                    <div class="toggles" style="display: flex; gap: 1rem; align-items: center; font-size: 0.9rem;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="mp-toggle-oil" checked> Ölpreis
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="mp-toggle-band" checked> Volatilität
                        </label>
                    </div>
                </div>

                <!-- Chart Container -->
                <div class="card chart-card" id="mp-chart-container" style="display: flex; flex-direction: column;">
                    <div id="mp-chart" class="chart-wrapper"></div>
                    
                    <!-- Legend -->
                    <div id="mp-legend" style="margin-top: 1rem; display: none; gap: 1.5rem; justify-content: center; flex-wrap: wrap; font-size: 0.85rem; color: var(--text-secondary); border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 20px; height: 3px; background: ${this.colors.fuel};"></span>
                            Tankpreis (Ø)
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 12px; height: 12px; background: ${this.colors.band}; border: 1px solid #ccc; border-radius: 2px;"></span>
                            Volatilitätsband
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 20px; height: 2px; border-bottom: 2px dashed ${this.colors.oil}; height:0;"></span>
                            Ölpreis (Brent)
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        // PLZ Mapping
        let cityToPlz = {}; // City -> PLZ

        fetch('js/data/plz3_cities.json')
            .then(r => r.json())
            .then(data => {
                // Build Reverse Map lowercased for case-insensitive search
                Object.entries(data).forEach(([plz, city]) => {
                    const c = city.trim();
                    if (!cityToPlz[c.toLowerCase()]) cityToPlz[c.toLowerCase()] = plz;
                });

                // Default to Stuttgart
                const input = this.container.querySelector('#mp-city-input');
                if (input) {
                    input.value = 'Stuttgart';
                    // Trigger initial load
                    update();
                }
            })
            .catch(e => console.warn('Konnte PLZ-Mapping nicht laden', e));

        const update = () => {
            if (!this.container) return; // Safety check

            // this.state.fuel updated by buttons

            // City Input validation
            const inputField = this.container.querySelector('#mp-city-input');
            const cityInputRaw = inputField.value.trim();
            const cityInput = cityInputRaw.toLowerCase();
            const chartDiv = this.container.querySelector('#mp-chart');
            const legendDiv = this.container.querySelector('#mp-legend');

            // Reset UI
            inputField.style.borderColor = '#ddd';
            legendDiv.style.display = 'none';

            if (!cityInput) {
                this.state.region = '';
                this.renderMessage('Bitte geben Sie eine Stadt ein.', 'info');
                return;
            }

            if (cityToPlz[cityInput]) {
                // Determine PLZ
                this.state.region = cityToPlz[cityInput];
                // Valid City -> Load Data
                this.loadData();
            } else {
                // Invalid City
                this.state.region = '';
                inputField.style.borderColor = 'red';
                this.renderMessage(`Stadt "${cityInputRaw}" nicht gefunden.`, 'warning');
            }
        };

        const toggles = () => {
            this.state.showOil = this.container.querySelector('#mp-toggle-oil').checked;
            this.state.showBand = this.container.querySelector('#mp-toggle-band').checked;
            this.state.showPhaseAsymmetrie = this.container.querySelector('#mp-toggle-p-asymmetrie').checked;
            this.state.showPhaseVolatility = this.container.querySelector('#mp-toggle-p-volatility').checked;

            this.renderChart(); // Just re-render chart if data exists
        };

        // Fuel Buttons Logic
        const fuelBtns = this.container.querySelectorAll('.btn-group-item');
        fuelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update UI
                fuelBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update State
                this.state.fuel = btn.dataset.value;
                state.set('fuelType', this.state.fuel);
                update();
            });
        });

        // Update on Enter or Blur
        const cityInput = this.container.querySelector('#mp-city-input');
        cityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                update();
            }
        });
        cityInput.addEventListener('blur', update);

        this.container.querySelector('#mp-toggle-oil').addEventListener('change', toggles);
        this.container.querySelector('#mp-toggle-band').addEventListener('change', toggles);
        this.container.querySelector('#mp-toggle-p-asymmetrie').addEventListener('change', toggles);
        this.container.querySelector('#mp-toggle-p-volatility').addEventListener('change', toggles);

        // Global State Subscription
        state.subscribe((s, key, value) => {
            if (key === 'fuelType') {
                // Update Buttons UI
                const btns = this.container.querySelectorAll('.btn-group-item');
                btns.forEach(b => {
                    if (b.dataset.value === value) b.classList.add('active');
                    else b.classList.remove('active');
                });

                // Update Internal State & Reload
                this.state.fuel = value;
                update();
            }
        });
    }

    renderMessage(msg, type = 'info') {
        const chartDiv = this.container.querySelector('#mp-chart');
        const color = type === 'warning' ? '#d9534f' : '#666';
        const icon = type === 'warning' ? '⚠️' : 'ℹ️';
        if (chartDiv) {
            chartDiv.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:${color};">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">${icon}</div>
                    <div>${msg}</div>
                </div>`;
        }
        // Clear chart instance reference so we don't try to update a destroyed chart
        this.chart = null;
    }

    async loadData() {
        const chartDiv = this.container.querySelector('#mp-chart');
        chartDiv.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;">Lade Analyse...</div>';

        try {
            const params = new URLSearchParams({
                fuel: this.state.fuel,
                region: this.state.region
            });

            const res = await fetch(`/api/data/market-phases?${params.toString()}`);
            if (!res.ok) throw new Error('Fehler beim Laden der Daten');

            const json = await res.json();
            this.data = json.timeseries;
            this.meta = json.phases; // Phasen-Intervalle
            this.metaData = json.meta; // Meta-Informationen

            // Datum parsen
            const parseDate = d3.timeParse('%Y-%m-%d');
            this.data.forEach(d => {
                d.parsedDate = parseDate(d.date);
            });
            this.meta.forEach(m => {
                m.startParsed = parseDate(m.start_date);
                m.endParsed = parseDate(m.end_date);
            });

            this.renderChart();

        } catch (e) {
            console.error(e);
            chartDiv.innerHTML = `<div style="color:red;text-align:center;padding:2rem;">Fehler: ${e.message}</div>`;
        }
    }

    renderChart() {
        if (!this.data || this.data.length === 0) return;

        const container = this.container.querySelector('#mp-chart');
        const legend = this.container.querySelector('#mp-legend');

        if (!this.chart) {
            this.chart = new MarketPhasesChart(container, this.colors);
        }

        // Show legend BEFORE update to ensure correct container measurement
        if (legend) legend.style.display = 'flex';

        this.chart.update(this.data, this.meta, this.state, this.metaData);
    }
}
