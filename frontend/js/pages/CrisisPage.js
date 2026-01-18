
import { api } from '../services/api.js';
import { state } from '../state.js';
import { LineChart } from '../components/LineChart.js';

export class CrisisPage {
    constructor() {
        this.unsubscribe = null;
    }

    async render(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center">
                <h1>⚡ Krisen-Radar</h1>
                <div class="filter-group">
                    <select id="crisis-fuel-select" style="width:auto; padding:0.5rem">
                        <option value="e10" selected>Super E10</option>
                        <option value="e5">Super E5</option>
                        <option value="diesel">Diesel</option>
                    </select>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="card full-width">
                    <h2>Krisen-Timeline & Events</h2>
                    <p class="text-muted" style="margin-bottom:1rem">
                        <span style="color:#ef4444">●</span> Ukraine-Konflikt 
                        <span style="margin-left:10px; color:#f59e0b">●</span> Tankrabatt
                    </p>
                    <div id="crisis-timeline" class="chart-container">
                         <div class="loading">Lade Timeline...</div>
                    </div>
                </div>

                <div class="card full-width">
                    <h2>📊 Markt-Volatilität (Unsicherheits-Index)</h2>
                    <div id="crisis-volatility" class="chart-container">
                        <div class="loading">Lade Volatilität...</div>
                    </div>
                </div>
            </div>
        `;

        this.container.querySelector('#crisis-fuel-select').addEventListener('change', (e) => {
            this.loadData(e.target.value);
        });

        await this.loadData('e10');
    }

    async loadData(fuel = 'e10') {
        const data = await api.getCrisisData(fuel); // Returns Trend Data enriched with Crisis Events

        // 1. Crisis Timeline (Reuse LineChart)
        if (!this.timelineChart) {
            const container = document.querySelector('#crisis-timeline');
            container.innerHTML = '';
            this.timelineChart = new LineChart(container, {
                fuelType: fuel,
                annotations: [
                    { date: '2022-03-01', label: 'Ukraine', color: '#ef4444' },
                    { date: '2022-06-01', label: 'Tankrabatt', color: '#f59e0b' }
                ]
            });
        }
        this.timelineChart.options.fuelType = fuel;
        this.timelineChart.update(data);

        // 2. Volatility Chart (LineChart but mapping StdDev to Value)
        // Transform data: price_mean = price_std for visuals
        const volatilityData = data.map(d => ({
            date: d.date,
            price_mean: d.price_std, // Hack to reuse LineChart
            price_min: d.price_std * 0.9,
            price_max: d.price_std * 1.1,
            ma_7d: d.price_std
        }));

        if (!this.volatilityChart) {
            const container = document.querySelector('#crisis-volatility');
            container.innerHTML = '';
            this.volatilityChart = new LineChart(container, { fuelType: fuel });
            // Customize y-axis format via D3 access in future, for now standard € view
        }
        this.volatilityChart.update(volatilityData);
    }

    destroy() {
        if (this.unsubscribe) this.unsubscribe();
        if (this.timelineChart) this.timelineChart.destroy();
        if (this.volatilityChart) this.volatilityChart.destroy();
    }
}
