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
            year: 2022,
            fuel: state.get('fuelType') || 'e10',
            region: '',
            showOil: false,
            // Phase Toggles
            showPhaseGleichlauf: true,
            showPhaseAsymmetrie: true,
            showPhaseVolatility: true,
            showBand: false
        };

        this.colors = {
            phase: {
                'GLEICHLAUF': 'rgba(224, 224, 255, 0.4)', // #e0e0ff
                'ASYMMETRIE': 'rgba(255, 224, 204, 0.4)', // #ffe0cc
                'INTERNE_VOLATILITÄT': 'rgba(232, 213, 242, 0.4)', // #e8d5f2
                'KEINE': 'transparent'
            },
            fuel: '#2196F3',
            oil: '#555',
            band: 'rgba(33, 150, 243, 0.15)'
        };
    }

    async render(container) {
        this.container = container;
        // Sync state from global
        this.state.fuel = state.get('fuelType') || 'e10';

        this.container.innerHTML = `
            <div class="market-phases-page" style="padding: 1.5rem; height: 100%; display: flex; flex-direction: column; overflow-y: auto;">
                
                <!-- Header -->
                <div style="margin-bottom: 1rem;">
                    <h1 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.8rem;">📊</span> Marktphasen-Analyse
                    </h1>
                </div>

                <!-- Controls -->
                <div class="controls-bar" style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; margin-bottom: 1rem;">
                    
                    <!-- Kraftstoff -->
                    <div class="control-group">
                        <div class="fuel-toggle-group" style="display:flex; background: #f0f2f5; padding: 3px; border-radius: 6px;">
                            <button class="fuel-btn ${this.state.fuel === 'e5' ? 'active' : ''}" data-value="e5" style="border:none; padding: 4px 12px; border-radius: 4px; cursor:pointer; font-size:0.9rem; font-weight:500; transition:all 0.2s;">Super E5</button>
                            <button class="fuel-btn ${this.state.fuel === 'e10' ? 'active' : ''}" data-value="e10" style="border:none; padding: 4px 12px; border-radius: 4px; cursor:pointer; font-size:0.9rem; font-weight:500; transition:all 0.2s;">E10</button>
                            <button class="fuel-btn ${this.state.fuel === 'diesel' ? 'active' : ''}" data-value="diesel" style="border:none; padding: 4px 12px; border-radius: 4px; cursor:pointer; font-size:0.9rem; font-weight:500; transition:all 0.2s;">Diesel</button>
                        </div>
                    </div>
                    
                    <div style="width: 1px; height: 30px; background: #eee; margin: 0 0.5rem;"></div>

                    <!-- Jahr -->
                    <div class="control-group">
                        <select id="mp-year" style="font-size: 0.95rem; font-weight: 600; padding: 6px; border-radius: 4px; border: 1px solid #ddd;">
                            <option value="2024">2024</option>
                            <option value="2023">2023</option>
                            <option value="2022" selected>2022</option>
                            <option value="2021">2021</option>
                            <option value="2020">2020</option>
                            <option value="2019">2019</option>
                        </select>
                    </div>

                    <!-- Stadt / Region -->
                    <div class="control-group">
                        <div style="position: relative;">
                             <input type="text" id="mp-city-input" placeholder="Stadt eingeben..." value="Stuttgart" style="font-size: 0.95rem; padding: 6px; border-radius: 4px; border: 1px solid #ddd; width: 140px;">
                        </div>
                    </div>

                    <div style="width: 1px; height: 30px; background: #eee; margin: 0 0.5rem;"></div>

                    <!-- Phasen anzeigen -->
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <span style="font-size: 0.85rem; font-weight: 600; color: #555;">Phasen:</span>
                        
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                            <input type="checkbox" id="mp-toggle-p-gleichlauf" checked>
                            <span style="width: 10px; height: 10px; background: ${this.colors.phase['GLEICHLAUF']}; border: 1px solid #ccc; display: inline-block;"></span>
                            Gleichlauf
                        </label>

                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                            <input type="checkbox" id="mp-toggle-p-asymmetrie" checked>
                            <span style="width: 10px; height: 10px; background: ${this.colors.phase['ASYMMETRIE']}; border: 1px solid #ccc; display: inline-block;"></span>
                            Asymmetrie
                        </label>

                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                            <input type="checkbox" id="mp-toggle-p-volatility" checked>
                            <span style="width: 10px; height: 10px; background: ${this.colors.phase['INTERNE_VOLATILITÄT']}; border: 1px solid #ccc; display: inline-block;"></span>
                            Interne Vol.
                        </label>
                    </div>

                    <div style="width: 1px; height: 30px; background: #eee; margin: 0 0.5rem;"></div>

                    <!-- Ölpreis & Vol.-Band -->
                    <div class="toggles" style="display: flex; gap: 1rem; align-items: center;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                            <input type="checkbox" id="mp-toggle-oil"> Ölpreis
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                            <input type="checkbox" id="mp-toggle-band"> Vol.-Band
                        </label>
                    </div>
                </div>

                <!-- Chart Container -->
                <div class="chart-card" id="mp-chart-container" style="flex: 1; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 1.5rem; min-height: 400px; position: relative; display: flex; flex-direction: column;">
                    <div id="mp-chart" style="width: 100%; flex: 1; position: relative;"></div>
                    
                    <!-- Legend (Only visible when data is loaded) -->
                    <div id="mp-legend" style="margin-top: 1rem; display: none; gap: 1.5rem; justify-content: center; flex-wrap: wrap; font-size: 0.8rem; color: #666; border-top: 1px solid #eee; padding-top: 1rem;">
                        <!-- Data Series -->
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 20px; height: 3px; background: ${this.colors.fuel};"></span>
                            Tankpreis (Ø)
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 12px; height: 12px; background: ${this.colors.band}; border: 1px solid #ccc;"></span>
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

            this.state.year = this.container.querySelector('#mp-year').value;
            this.state.year = this.container.querySelector('#mp-year').value;
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
            this.state.showPhaseGleichlauf = this.container.querySelector('#mp-toggle-p-gleichlauf').checked;
            this.state.showPhaseAsymmetrie = this.container.querySelector('#mp-toggle-p-asymmetrie').checked;
            this.state.showPhaseVolatility = this.container.querySelector('#mp-toggle-p-volatility').checked;

            this.renderChart(); // Just re-render chart if data exists
        };

        this.container.querySelector('#mp-year').addEventListener('change', update);
        this.container.querySelector('#mp-year').addEventListener('change', update);

        // Fuel Buttons Logic
        const fuelBtns = this.container.querySelectorAll('.fuel-btn');
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
        this.container.querySelector('#mp-toggle-p-gleichlauf').addEventListener('change', toggles);
        this.container.querySelector('#mp-toggle-p-asymmetrie').addEventListener('change', toggles);
        this.container.querySelector('#mp-toggle-p-volatility').addEventListener('change', toggles);

        // Global State Subscription
        state.subscribe((s, key, value) => {
            if (key === 'fuelType') {
                // Update Buttons UI
                const btns = this.container.querySelectorAll('.fuel-btn');
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
                year: this.state.year,
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

        this.chart.update(this.data, this.meta, this.state, this.metaData);

        // Show legend
        if (legend) legend.style.display = 'flex';
    }
}
