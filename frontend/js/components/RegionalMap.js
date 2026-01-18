export class RegionalMap {
    constructor(container, data, options = {}) {
        this.container = container;
        this.data = data; // Array of {region_plz2, e5, e10, diesel}
        this.options = {
            fuelType: 'e10',
            month: 1, // Default January
            onRegionSelect: null,
            ...options
        };
        this.init();
    }

    async init() {
        this.container.innerHTML = '<div class="loading">Lade Karte...</div>';

        // 1. Fetch GeoJSON (Background: States)
        try {
            const response = await fetch('/api/geo/states');
            if (!response.ok) throw new Error("Hintergrund-Karte nicht gefunden");
            this.geoJson = await response.json();
        } catch (e) {
            this.container.innerHTML = `<p style="color:red">Kartenfehler: ${e.message}</p>`;
            return;
        }

        this.container.innerHTML = '';
        this.mapId = 'leaflet-map-' + Math.random().toString(36).substr(2, 9);
        const mapDiv = document.createElement('div');
        mapDiv.id = this.mapId;
        mapDiv.style.width = '100%';
        mapDiv.style.height = '100%';
        this.container.appendChild(mapDiv);

        // 2. Leaflet Init
        this.map = L.map(this.mapId).setView([51.1657, 10.4515], 6); // Center Germany

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '©OpenStreetMap, ©CartoDB'
        }).addTo(this.map);

        this.renderLayer();
    }

    renderLayer() {
        if (!this.geoJson) return;

        // Clear Layers
        if (this.bgLayer) this.map.removeLayer(this.bgLayer);
        if (this.bubbleLayer) this.map.removeLayer(this.bubbleLayer);

        // 1. Draw Background (States)
        this.bgLayer = L.geoJSON(this.geoJson, {
            style: {
                fillColor: '#f5f5f5',
                weight: 1,
                opacity: 1,
                color: '#ddd',
                fillOpacity: 0.4
            }
        }).addTo(this.map);

        // 2. Draw Bubbles (Data)
        if (!this.data || this.data.length === 0) return;

        const fuel = this.options.fuelType;
        const month = this.options.month;

        // Filter by Month
        const monthlyData = this.data.filter(d => d.month === month);
        const prices = monthlyData.map(d => d[fuel]).filter(p => p != null);

        if (prices.length === 0) return;

        const min = Math.min(...prices);
        const max = Math.max(...prices);

        // Color Scale Helper
        const getColor = (val) => {
            if (!val) return '#ccc';
            // Simple Red-Green (Green=Low, Red=High)
            // Reverse of typical heatmap? No, Low Price is Good (Green).
            const t = (val - min) / (max - min);
            const hue = (1 - t) * 120; // 0=Red, 120=Green
            return `hsl(${hue}, 80%, 45%)`;
        };

        this.bubbleLayer = L.layerGroup();

        this.data.forEach(d => {
            // Check for valid lat/lon
            if (d.lat && d.lon && d[fuel]) {
                const price = d[fuel];

                const circle = L.circleMarker([d.lat, d.lon], {
                    radius: 10, // Fixed radius for dots
                    fillColor: getColor(price),
                    color: '#fff',
                    weight: 1,
                    opacity: 0.8,
                    fillOpacity: 0.7
                });

                circle.bindTooltip(`
                    <div style="text-align:center">
                        <strong>Region PLZ-${d.region_plz2}</strong><br>
                        ${fuel.toUpperCase()}: ${price.toFixed(3)} €
                    </div>
                `, { direction: 'top' });

                this.bubbleLayer.addLayer(circle);
            }
        });

        this.bubbleLayer.addTo(this.map);

        // Fit bounds to background
        if (!this.initialFit) {
            this.map.fitBounds(this.bgLayer.getBounds());
            this.initialFit = true;
        }
    }

    update(fuelType, month) {
        this.options.fuelType = fuelType;
        if (month) this.options.month = month;
        this.renderLayer();
    }
}
