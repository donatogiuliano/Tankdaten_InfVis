import { CrisisChart } from '../components/CrisisChart.js';
import { state } from '../state.js';

export class CrisisPage {
    constructor() {
        this.data = null;
        this.selectedFuel = state.get('fuelType') || 'e10';
        this.resizeObserver = null;
        this.chart = null;
    }

    async render(container) {
        this.container = container;
        // Sync state
        this.selectedFuel = state.get('fuelType') || 'e10';

        // Corona-Event Markers
        this.coronaEvents = [
            { date: '2020-03-22', label: '1. Lockdown', color: '#e53935', icon: '🔒' },
            { date: '2020-05-06', label: 'Lockerungen', color: '#4caf50', icon: '🔓' },
            { date: '2020-11-02', label: '2. Lockdown', color: '#e53935', icon: '🔒' }
        ];

        container.innerHTML = `
            <div class="corona-page" style="padding: 1.5rem; height: 100%; display: flex; flex-direction: column; box-sizing: border-box;">
                
                <!-- Header -->
                <div style="margin-bottom: 1rem;">
                    <h1 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.8rem;">🦠</span> Corona-Krise 2020
                    </h1>
                </div>

                <!-- Controls -->
                <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap;">
                    <div class="fuel-toggle-group" style="display:flex; background: #f0f2f5; padding: 3px; border-radius: 6px;">
                        <button class="fuel-btn ${this.selectedFuel === 'e5' ? 'active' : ''}" data-fuel="e5" style="border:none; padding: 4px 12px; border-radius: 4px; cursor:pointer; font-size:0.9rem; font-weight:500; transition:all 0.2s;">Super E5</button>
                        <button class="fuel-btn ${this.selectedFuel === 'e10' ? 'active' : ''}" data-fuel="e10" style="border:none; padding: 4px 12px; border-radius: 4px; cursor:pointer; font-size:0.9rem; font-weight:500; transition:all 0.2s;">E10</button>
                        <button class="fuel-btn ${this.selectedFuel === 'diesel' ? 'active' : ''}" data-fuel="diesel" style="border:none; padding: 4px 12px; border-radius: 4px; cursor:pointer; font-size:0.9rem; font-weight:500; transition:all 0.2s;">Diesel</button>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-left: auto;">
                        ${this.coronaEvents.map(e => `
                            <div style="display: flex; align-items: center; gap: 4px; font-size: 0.95rem; color: #5f6368; font-weight: 500;">
                                <span style="width: 12px; height: 12px; background: ${e.color}; border-radius: 3px;"></span>
                                ${e.icon} ${e.label}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Chart Container -->
                <div class="chart-card" style="flex: 1; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 1.5rem; display: flex; flex-direction: column; min-height: 400px;">
                    <div id="corona-chart" style="flex: 1; position: relative;">
                        <div class="loading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                            <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #333; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                            <p>Lade Corona-Daten...</p>
                        </div>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div id="stats-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                </div>
            </div>
            
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .fuel-btn:hover { background-color: rgba(0,0,0,0.05); }
                .fuel-btn.active { background-color: #333; color: white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
                .stat-card { background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
                .stat-card .label { font-size: 0.75rem; color: #888; text-transform: uppercase; margin-bottom: 0.25rem; }
                .stat-card .value { font-size: 1.5rem; font-weight: 700; }
                .tooltip-corona { position: absolute; background: rgba(0,0,0,0.85); color: white; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; pointer-events: none; z-index: 100; }
            </style>
        `;

        this.initEvents();
        await this.loadData();
    }

    initEvents() {
        const fuelBtns = this.container.querySelectorAll('.fuel-btn');
        fuelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                fuelBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                btn.classList.add('active');
                this.selectedFuel = btn.dataset.fuel;
                state.set('fuelType', this.selectedFuel);
                this.renderChart();
                this.renderStats();
            });
        });

        // Global State Subscription
        state.subscribe((s, key, value) => {
            if (key === 'fuelType') {
                // Update Buttons UI
                const btns = this.container.querySelectorAll('.fuel-btn');
                btns.forEach(b => {
                    if (b.dataset.fuel === value) b.classList.add('active');
                    else b.classList.remove('active');
                });

                // Update Internal State & Reload
                this.selectedFuel = value;
                this.renderChart();
                this.renderStats();
            }
        });
    }

    async loadData() {
        try {
            const response = await fetch('/api/data/corona');
            if (!response.ok) throw new Error('Daten nicht gefunden');
            this.data = await response.json();

            // Wait for DOM to be fully rendered before drawing chart
            requestAnimationFrame(() => {
                setTimeout(() => {
                    this.renderChart();
                    this.renderStats();

                    // Add resize observer to re-render on container size change
                    if (!this.resizeObserver) {
                        this.resizeObserver = new ResizeObserver(() => {
                            if (this.data) {
                                this.renderChart();
                            }
                        });
                        const chartContainer = this.container.querySelector('#corona-chart');
                        if (chartContainer) {
                            this.resizeObserver.observe(chartContainer);
                        }
                    }
                }, 200);
            });
        } catch (e) {
            console.error(e);
            this.container.querySelector('#corona-chart').innerHTML = `
                <div style="text-align: center; color: #e53935; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <p>Fehler beim Laden: ${e.message}</p>
                </div>
            `;
        }
    }

    renderChart() {
        if (!this.data) return;

        const chartContainer = this.container.querySelector('#corona-chart');

        if (!this.chart) {
            this.chart = new CrisisChart(chartContainer, this.coronaEvents);
        }

        this.chart.update(this.data, this.selectedFuel);
    }

    renderStats() {
        if (!this.data) return;

        const fuelData = this.data.filter(d => d.fuel === this.selectedFuel);

        const fuelNames = { 'e5': 'Super E5', 'e10': 'E10', 'diesel': 'Diesel' };
        const fuelName = fuelNames[this.selectedFuel] || this.selectedFuel.toUpperCase();

        const prices = fuelData.map(d => d.price_mean);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const diff = max - min;

        const minEntry = fuelData.find(d => d.price_mean === min);
        const maxEntry = fuelData.find(d => d.price_mean === max);

        const statsContainer = this.container.querySelector('#stats-cards');
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="label">📉 Tiefstwert ${fuelName}</div>
                <div class="value" style="color: #009688;">${min.toFixed(3)} €/L</div>
                <div style="font-size: 0.8rem; color: #888;">${minEntry?.date || ''}</div>
            </div>
            <div class="stat-card">
                <div class="label">📈 Höchstwert ${fuelName}</div>
                <div class="value" style="color: #9c27b0;">${max.toFixed(3)} €/L</div>
                <div style="font-size: 0.8rem; color: #888;">${maxEntry?.date || ''}</div>
            </div>
            <div class="stat-card">
                <div class="label">⌀ Jahresdurchschnitt ${fuelName}</div>
                <div class="value">${avg.toFixed(3)} €/L</div>
            </div>
            <div class="stat-card">
                <div class="label">↕️ Schwankung ${fuelName}</div>
                <div class="value">${diff.toFixed(3)} €/L</div>
                <div style="font-size: 0.8rem; color: #888;">${((diff / avg) * 100).toFixed(1)}% vom Durchschnitt</div>
            </div>
        `;
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.chart) {

        }
    }
}
