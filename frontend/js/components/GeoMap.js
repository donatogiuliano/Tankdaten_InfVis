
import { COLORS } from './colors.js';

export class GeoMap {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        this.map = null;
        this.markersLayer = null;
        this.options = options;

        // Default center (Stuttgart/BW)
        this.defaultView = { lat: 48.7758, lng: 9.1829, zoom: 8 };

        this.init();
    }

    init() {
        if (!this.container) return;

        // Init Leaflet
        this.map = L.map(this.container, {
            center: [this.defaultView.lat, this.defaultView.lng],
            zoom: this.defaultView.zoom,
            attributionControl: false
        });

        // Light Theme Tiles (CartoDB Positron)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);

        this.markersLayer = L.layerGroup().addTo(this.map);
    }

    update(data) {
        if (!this.map || !data) return;

        this.markersLayer.clearLayers();

        // Filter valid data
        const validData = data.filter(d => d.latitude && d.longitude && d.price > 0);
        if (validData.length === 0) return;

        // Calculate stats for color scale
        const prices = validData.map(d => d.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);

        validData.forEach(d => {
            const color = this.getColor(d.price, min, max);

            const marker = L.circleMarker([d.latitude, d.longitude], {
                radius: 6,
                fillColor: color,
                color: '#fff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });

            marker.bindPopup(`
                <div style="text-align:center; font-family: sans-serif;">
                    <strong style="font-size:1.1em; color:#333">${d.station_name}</strong><br>
                    <span style="color:#666; font-size:0.9em">${d.city || 'Unbekannt'}</span><br>
                    <div style="margin-top:4px; font-weight:bold; font-size:1.2em; color:${COLORS.primary}">
                        ${d.price.toFixed(3)} €
                    </div>
                </div>
            `);

            this.markersLayer.addLayer(marker);
        });

        // Fit bounds if we have points
        if (validData.length > 0) {
            // Create bounds from points
            const group = new L.featureGroup(this.markersLayer.getLayers());
            this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
    }

    getColor(price, min, max) {
        // Simple red-yellow-green scale
        const ratio = (price - min) / (max - min);
        // Invert ratio because low price = good (green)
        // using HSL: 120 (Green) -> 0 (Red)
        const hue = (1 - ratio) * 120;
        return `hsl(${hue}, 70%, 50%)`;
    }

    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}
