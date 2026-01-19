import { LineChart } from '../components/LineChart.js';
import { Heatmap } from '../components/Heatmap.js';

export class TrendsPage {
    async render(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center">
                <div>
                    <h1>📈 Preistrends</h1>
                    <p>Historische Entwicklung und Saisonale Muster</p>
                </div>
                <div class="filter-group">
                    <label>Sorte: 
                        <select id="trends-fuel-select" style="padding:0.5rem; border-radius:8px;">
                            <option value="e10" selected>Super E10</option>
                            <option value="e5">Super E5</option>
                            <option value="diesel">Diesel</option>
                        </select>
                    </label>
                </div>
            </div>

            <div class="dashboard-grid">
                <!-- Main Chart -->
                <div class="card full-width">
                    <h2>Langzeit-Entwicklung (Brushing)</h2>
                    <div id="trend-line-chart" class="chart-container" style="height: 400px; width: 100%;">
                        <div class="loading">Lade Daten...</div>
                    </div>
                </div>

                <!-- Secondary Chart -->
                <div class="card full-width">
                    <h2>📅 Saisonale Heatmap</h2>
                    <p style="font-size:0.9rem; color: #666">Zeigt Durchschnittspreise pro Monat/Jahr. Markiere oben einen Bereich, um hier zu filtern.</p>
                    <div id="trend-heatmap" class="chart-container" style="height: 400px; width: 100%;">
                        <div class="loading">Warte auf Daten...</div>
                    </div>
                </div>
            </div>
        `;

        this.initCharts();
    }

    async initCharts() {
        try {
            // Fetch Daily Data (Full History)
            const response = await fetch('/api/data/daily');
            const rawData = await response.json();

            // Prepare Containers
            const lineContainer = this.container.querySelector('#trend-line-chart');
            const mapContainer = this.container.querySelector('#trend-heatmap');

            // Remove Loaders
            lineContainer.innerHTML = '';
            mapContainer.innerHTML = '';

            // Init Charts
            this.lineChart = new LineChart(lineContainer, rawData, {
                fuelType: 'e10',
                onBrush: (range) => this.handleBrush(range)
            });

            this.heatmap = new Heatmap(mapContainer, rawData, {
                fuelType: 'e10'
            });
            this.heatmap.update(null); // Initial render full range

            // Helper: Handle Window Resize for responsiveness
            window.addEventListener('resize', () => {
                // Ideally re-init or update width
            });

            // Fuel Switcher
            const selector = this.container.querySelector('#trends-fuel-select');
            selector.addEventListener('change', (e) => {
                const fuel = e.target.value;
                this.lineChart.options.fuelType = fuel;
                this.heatmap.options.fuelType = fuel;

                this.lineChart.update(this.lineChart.data); // maintain current data
                this.heatmap.update(null); // Reset filter on fuel change? or keep? keeping null for simplify
            });

        } catch (error) {
            console.error("Error loading data:", error);
            this.container.querySelector('#trend-line-chart').innerHTML = `<p style="color:red">Fehler beim Laden: ${error.message}</p>`;
        }
    }

    handleBrush(range) {
        // range is [Date Start, Date End] or null
        this.heatmap.update(range);
    }
}
