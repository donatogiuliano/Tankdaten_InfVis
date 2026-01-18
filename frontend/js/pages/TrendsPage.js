import { api } from '../services/api.js';
import { state } from '../state.js';
import { LineChart } from '../components/LineChart.js';
import { HeatMap } from '../components/HeatMap.js';

export class TrendsPage {
    constructor() {
        this.unsubscribe = null;
    }

    async render(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center">
                <h1>📈 Markttrends</h1>
                <div class="filter-group">
                    <select id="trends-fuel-select" style="width:auto; padding:0.5rem">
                        <option value="e10" selected>Super E10</option>
                        <option value="e5">Super E5</option>
                        <option value="diesel">Diesel</option>
                    </select>
                </div>
            </div>

            <div class="dashboard-grid">
                <!-- Main Chart -->
                <div class="card full-width">
                    <h2>Preisentwicklung (letzte 365 Tage)</h2>
                    <div id="trend-line-chart" class="chart-container">
                        <div class="loading">Lade Diagramm...</div>
                    </div>
                </div>

                <!-- Secondary Chart -->
                <div class="card full-width">
                    <h2>📅 Wochen- & Tagesmuster (Heatmap)</h2>
                    <div id="trend-heatmap" class="chart-container">
                        <div class="loading">Lade Heatmap...</div>
                    </div>
                </div>
            </div>
        `;

        // Local Event Listener
        this.container.querySelector('#trends-fuel-select').addEventListener('change', (e) => {
            this.loadData(e.target.value);
        });

        await this.loadData('e10');
    }

    async loadData(fuel = 'e10') {
        // Parallel fetch
        const [trendData, heatmapData] = await Promise.all([
            api.getTrendData(fuel),
            api.getHeatmapData(fuel)
        ]);

        // --- Line Chart ---
        if (!this.lineChart) {
            const container = document.querySelector('#trend-line-chart');
            container.innerHTML = '';
            this.lineChart = new LineChart(container, { fuelType: fuel });
        }
        this.lineChart.options.fuelType = fuel;
        this.lineChart.update(trendData);

        // --- HeatMap ---
        if (!this.heatMap) {
            const container = document.querySelector('#trend-heatmap');
            container.innerHTML = '';
            this.heatMap = new HeatMap(container, { fuelType: fuel });
        }
        this.heatMap.update(heatmapData);
    }

    destroy() {
        if (this.unsubscribe) this.unsubscribe();
        if (this.lineChart) this.lineChart.destroy();
        if (this.heatMap) this.heatMap.destroy();
    }
}
