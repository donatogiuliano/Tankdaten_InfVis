import { CrisisChart } from '../components/CrisisChart.js';
import { state } from '../state.js';

export class CrisisPage {
    constructor() {
        this.data = null;
        this.selectedFuel = state.get('fuelType') || 'e10';
        this.resizeObserver = null;
        this.chart = null;
        this.handleA11yToggle = this.handleA11yToggle.bind(this);
    }

    async render(container) {
        this.container = container;
        this.selectedFuel = state.get('fuelType') || 'e10';

        this.coronaEvents = [
            { date: '2020-03-22', label: '1. Lockdown', color: '#e53935', icon: '🔒' },
            { date: '2020-05-06', label: 'Lockerungen', color: '#4caf50', icon: '🔓' },
            { date: '2020-11-02', label: '2. Lockdown', color: '#e53935', icon: '🔒' }
        ];

        container.innerHTML = `
            <div class="page-layout">
                
                <!-- Header -->
                <div class="page-header">
                    <h1 class="page-title">
                        <span>🦠</span> Corona-Krise 2020
                    </h1>
                </div>

                <!-- Controls -->
                <div class="controls-row">
                    <div class="button-group fuel-toggle-group">
                        <button class="btn-group-item ${this.selectedFuel === 'e5' ? 'active' : ''}" data-fuel="e5">Super E5</button>
                        <button class="btn-group-item ${this.selectedFuel === 'e10' ? 'active' : ''}" data-fuel="e10">E10</button>
                        <button class="btn-group-item ${this.selectedFuel === 'diesel' ? 'active' : ''}" data-fuel="diesel">Diesel</button>
                    </div>
                    
                    <div class="legend-container">
                        ${this.coronaEvents.map(e => `
                            <div class="legend-item">
                                <span class="legend-dot" style="background: ${e.color}; border-radius: 3px;"></span>
                                ${e.icon} ${e.label}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Chart Container -->
                <div class="card chart-card">
                    <div id="corona-chart" class="chart-wrapper">
                        <div class="loading-screen">
                            <div class="spinner"></div>
                            <p>Lade Corona-Daten...</p>
                        </div>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div id="stats-cards" class="stats-grid" style="margin-top: 1.5rem;"></div>
            </div>
            
            <style>
                .tooltip-corona { position: absolute; background: rgba(0,0,0,0.85); color: white; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; pointer-events: none; z-index: 100; }
            </style>
        `;

        this.initEvents();
        await this.loadData();
    }

    initEvents() {
        const fuelBtns = this.container.querySelectorAll('.btn-group-item');
        fuelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                fuelBtns.forEach(b => b.classList.remove('active'));
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
                const btns = this.container.querySelectorAll('.btn-group-item');
                btns.forEach(b => {
                    if (b.dataset.fuel === value) b.classList.add('active');
                    else b.classList.remove('active');
                });

                this.selectedFuel = value;
                this.renderChart();
                this.renderStats();
            } else if (key === 'colorMode') {
                // Re-render chart with new color mode
                this.renderChart();
                this.updateLegendColors();
            }
        });
    }

    updateLegendColors() {
        const isAccessible = state.get('colorMode') === 'accessible';
        const colors = isAccessible ? ['#D50000', '#304FFE', '#D50000'] : ['#e53935', '#4caf50', '#e53935'];

        const dots = this.container.querySelectorAll('.legend-dot');
        if (dots.length >= 3) {
            dots[0].style.background = colors[0]; // 1. Lockdown
            dots[1].style.background = colors[1]; // Lockerungen
            dots[2].style.background = colors[2]; // 2. Lockdown
        }
    }

    handleA11yToggle() {
        if (!this.container || this.container.style.display === 'none') return;

        const current = state.get('colorMode');
        const next = current === 'accessible' ? 'default' : 'accessible';
        state.set('colorMode', next);

        this.renderChart();
        this.updateLegendColors();

        const btn = document.getElementById('accessibility-toggle');
        if (btn) btn.classList.toggle('active', next === 'accessible');
    }

    async loadData() {
        try {
            const response = await fetch('/api/data/corona');
            if (!response.ok) throw new Error('Daten nicht gefunden');
            this.data = await response.json();

            requestAnimationFrame(() => {
                setTimeout(() => {
                    this.renderChart();
                    this.renderStats();

                    // Restore "Old Style" Logic for UkrainePage
                    const globalA11yBtn = document.getElementById('accessibility-toggle');
                    if (globalA11yBtn) {
                        // Prevent duplicates by removing first (if exists)
                        globalA11yBtn.removeEventListener('click', this.handleA11yToggle);
                        globalA11yBtn.addEventListener('click', this.handleA11yToggle);
                    }

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
                <div class="loading-screen" style="color: var(--danger);">
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

        this.chart.update(this.data, this.selectedFuel, state.get('colorMode'));
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
            <div class="stat-box">
                <div class="stat-label">📉 Tiefstwert ${fuelName}</div>
                <div class="stat-value" style="color: var(--success);">${min.toFixed(3)} €/L</div>
                <div class="stat-sub">${minEntry?.date || ''}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">📈 Höchstwert ${fuelName}</div>
                <div class="stat-value" style="color: var(--danger);">${max.toFixed(3)} €/L</div>
                <div class="stat-sub">${maxEntry?.date || ''}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">⌀ Jahresdurchschnitt ${fuelName}</div>
                <div class="stat-value">${avg.toFixed(3)} €/L</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">↕️ Schwankung ${fuelName}</div>
                <div class="stat-value">${diff.toFixed(3)} €/L</div>
                <div class="stat-sub">${((diff / avg) * 100).toFixed(1)}% vom Durchschnitt</div>
            </div>
        `;
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        const globalA11yBtn = document.getElementById('accessibility-toggle');
        if (globalA11yBtn) {
            globalA11yBtn.removeEventListener('click', this.handleA11yToggle);
        }

        if (this.chart) {

        }
    }
}

