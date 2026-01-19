export class OverviewPage {
    async render(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="dashboard-header">
                <h1>🏠 Marktübersicht</h1>
                <p>Aktuelle Zusammenfassung des Tankstellen-Marktes</p>
            </div>

            <div class="dashboard-grid">
                <!-- Summary Cards Placeholder -->
                <div class="card">
                    <h2>Aktueller Durchschnitt</h2>
                    <div class="loading">Lade Daten...</div>
                </div>
                
                <div class="card">
                    <h2>Tages-Trend</h2>
                    <div class="loading">Lade Trend...</div>
                </div>

                <div class="card">
                    <h2>Teuerste Region</h2>
                    <div class="loading">Lade Region...</div>
                </div>
            </div>
        `;
    }
}
