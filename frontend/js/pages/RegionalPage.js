import { RegionalMap } from '../components/RegionalMap.js';

export class RegionalPage {
    async render(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center">
                <h1>Regional-Vergleich</h1>
            </div>

            <div class="dashboard-grid">
                <!-- Map (Full Screenish) -->
                <div class="card full-width" style="height: 700px; display: flex; flex-direction: column;">
                    <div class="map-controls" style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center; background: #f8f9fa; padding: 0.5rem; border-radius: var(--radius-sm);">
                        
                        <!-- Controls -->
                        <div class="control-group">
                            <label style="font-size:0.8rem; color:#666; margin-right:0.5rem">Jahr</label>
                            <select id="regional-year-select" class="styled-select">
                                <!-- Populated via JS -->
                            </select>
                        </div>

                        <div class="control-group">
                            <label style="font-size:0.8rem; color:#666; margin-right:0.5rem">Monat</label>
                            <select id="regional-month-select" class="styled-select">
                                <option value="1">Januar</option>
                                <option value="2">Februar</option>
                                <option value="3">März</option>
                                <option value="4">April</option>
                                <option value="5">Mai</option>
                                <option value="6">Juni</option>
                                <option value="7">Juli</option>
                                <option value="8">August</option>
                                <option value="9">September</option>
                                <option value="10">Oktober</option>
                                <option value="11">November</option>
                                <option value="12">Dezember</option>
                            </select>
                        </div>
                        
                        <div class="control-group">
                             <label style="font-size:0.8rem; color:#666; margin-right:0.5rem">Sorte</label>
                             <select id="regional-fuel-select" class="styled-select">
                                <option value="e10" selected>Super E10</option>
                                <option value="e5">Super E5</option>
                                <option value="diesel">Diesel</option>
                            </select>
                        </div>

                        <span id="map-status" style="font-size: 0.9rem; color: #888; margin-left: auto;"></span>
                    </div>

                     <div id="regional-map" class="map-container" style="flex:1; width: 100%; border-radius: var(--radius-sm); overflow:hidden; position:relative;">
                        <div class="loading">Lade Karte...</div>
                     </div>
                </div>
            </div>
        `;

        this.initMap();
    }

    async initMap() {
        try {
            // Populate Year Selector (2014 - 2024)
            const yearSelect = this.container.querySelector('#regional-year-select');
            const currentYear = new Date().getFullYear();
            for (let y = currentYear; y >= 2014; y--) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.text = y;
                if (y === 2023) opt.selected = true; // Default to a full year for better data? or current
                yearSelect.appendChild(opt);
            }

            const mapContainer = this.container.querySelector('#regional-map');
            mapContainer.innerHTML = '';

            // Initial Load
            await this.loadDataAndUpdate(yearSelect.value);

            // Listeners
            yearSelect.addEventListener('change', async (e) => {
                await this.loadDataAndUpdate(e.target.value);
            });

            const monthSelect = this.container.querySelector('#regional-month-select');
            monthSelect.addEventListener('change', (e) => {
                if (this.map) {
                    const fuel = this.container.querySelector('#regional-fuel-select').value;
                    const month = parseInt(e.target.value);
                    this.map.update(fuel, month);
                }
            });

            this.container.querySelector('#regional-fuel-select').addEventListener('change', (e) => {
                const fuel = e.target.value;
                const month = parseInt(monthSelect.value);
                if (this.map) this.map.update(fuel, month);
            });

        } catch (e) {
            console.error(e);
            this.container.innerHTML += `<p style="color:red">${e.message}</p>`;
        }
    }

    async loadDataAndUpdate(year) {
        const status = this.container.querySelector('#map-status');
        status.textContent = `Lade Daten für ${year}...`;

        try {
            const response = await fetch(`/api/data/regional?year=${year}`);
            const data = await response.json();

            status.textContent = `${data.length} Regionen geladen.`;

            const initialMonth = parseInt(this.container.querySelector('#regional-month-select').value);

            if (!this.map) {
                this.map = new RegionalMap(this.container.querySelector('#regional-map'), data, {
                    fuelType: 'e10',
                    month: initialMonth,
                    onRegionSelect: (plz) => console.log(plz)
                });
            } else {
                this.map.data = data;
                this.map.update(this.container.querySelector('#regional-fuel-select').value, initialMonth);
            }
        } catch (err) {
            status.textContent = "Fehler beim Laden.";
            console.error(err);
        }
    }
}
