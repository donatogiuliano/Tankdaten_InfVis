
import { api } from '../services/api.js';
import { state } from '../state.js';
import { GeoMap } from '../components/GeoMap.js';
import { BarChart } from '../components/BarChart.js';

export class RegionalPage {
    constructor() {
        this.unsubscribe = null;
    }

    async render(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center">
                <h1>🗺️ Regional-Check</h1>
                <div class="filter-group">
                    <select id="regional-fuel-select" style="width:auto; padding:0.5rem">
                        <option value="e10" selected>Super E10</option>
                        <option value="e5">Super E5</option>
                        <option value="diesel">Diesel</option>
                    </select>
                </div>
            </div>

            <div class="dashboard-grid">
                <!-- Map (Left/Top) -->
                <div class="card" style="grid-column: 1 / 2">
                    <h2>Preis-Karte BW</h2>
                     <div id="regional-map" class="map-container">
                        <div class="loading">Lade Karte...</div>
                     </div>
                </div>

                <!-- Ranking (Right/Bottom) -->
                <div class="card" style="grid-column: 2 / 3">
                    <h2>🏆 Regionen Ranking</h2>
                    <div id="regional-ranking" class="chart-container" style="height: 600px">
                        <div class="loading">Lade Ranking...</div>
                    </div>
                </div>
            </div>
        `;

        this.container.querySelector('#regional-fuel-select').addEventListener('change', (e) => {
            this.loadData(e.target.value);
        });

        await this.loadData('e10');
        this.unsubscribe = state.subscribe((s, key, val) => {
            if (key === 'fuelType') this.loadData();
        });
    }

    async loadData(fuel = 'e10') {
        // Load data
        const [mapData, rankingData] = await Promise.all([
            api.getMapData(fuel),        // Real GeoJSON Points
            api.getRegionalData(fuel)    // Dummy Ranking Data
        ]);

        // Init/Update Map
        if (!this.geoMap) {
            document.getElementById('regional-map').innerHTML = ''; // Clear loader
            this.geoMap = new GeoMap('regional-map');
        }
        this.geoMap.update(mapData);

        // Init/Update Ranking
        if (!this.barChart) {
            document.getElementById('regional-ranking').innerHTML = ''; // Clear loader
            this.barChart = new BarChart('regional-ranking');
        }
        // Mapping dummy regional data for BarChart: { name, price_mean } -> { name, value }
        const chartData = rankingData.map(d => ({
            name: d.name,
            value: d.price_mean
        }));
        this.barChart.update(chartData);
    }

    destroy() {
        if (this.unsubscribe) this.unsubscribe();
        if (this.geoMap) this.geoMap.destroy();
        if (this.barChart) this.barChart.destroy();
    }
}
