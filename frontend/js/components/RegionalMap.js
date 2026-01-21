export class RegionalMap {
    constructor(container, data, options = {}) {
        this.container = container;
        this.data = data;
        this.options = {
            fuelType: 'e10',
            month: 1,
            year: new Date().getFullYear(),
            onRegionSelect: null,
            colorMode: 'default',
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
        const maxBounds = [[45.0, 3.0], [57.0, 18.0]];
        this.map = L.map(this.mapId, {
            minZoom: 6,
            maxBounds: maxBounds,
            maxBoundsViscosity: 1.0
        }).setView([51.1657, 10.4515], 6);

        // Use OpenStreetMap.de (German Labels)
        L.tileLayer('https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            className: 'bw-tiles'
        }).addTo(this.map);

        this.renderLayer();
    }

    renderLayer() {
        if (!this.geoJson) return;

        // Clear Layers
        if (this.bgLayer) this.map.removeLayer(this.bgLayer);
        if (this.bubbleLayer) this.map.removeLayer(this.bubbleLayer);
        if (this.highlightLayer) this.map.removeLayer(this.highlightLayer);

        // 1. Draw Background (States)
        this.bgLayer = L.geoJSON(this.geoJson, {
            style: {
                fillColor: 'transparent',
                weight: 0.8,
                opacity: 0.5,
                color: '#333',
                dashArray: '4, 4',
                fillOpacity: 0
            }
        }).addTo(this.map);

        // 2. Draw Grid Cells
        if (!this.data || this.data.length === 0) return;

        const fuel = this.options.fuelType;
        const month = this.options.month;
        const GRID_STEP = 0.1;

        // Filter by Month
        const monthlyData = this.data.filter(d => d.month === month);

        // 3. Calculate Scale
        const allPrices = this.data
            .map(d => d[fuel])
            .filter(p => p != null && !isNaN(p));

        if (allPrices.length === 0) return;

        const getPercentile = (arr, p) => {
            const sorted = [...arr].sort((a, b) => a - b);
            const index = (sorted.length - 1) * p;
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            const weight = index - lower;
            if (upper >= sorted.length) return sorted[lower];
            return sorted[lower] * (1 - weight) + sorted[upper] * weight;
        };

        const min = getPercentile(allPrices, 0.05);
        const max = getPercentile(allPrices, 0.95);

        const getColor = (val) => {
            if (!val) return '#ccc';
            const t = (val - min) / (max - min || 1);
            const tClamped = Math.max(0, Math.min(1, t));

            if (this.options.colorMode === 'accessible') {
                if (tClamped < 0.5) {
                    const localT = tClamped * 2;
                    return `hsl(${240 - (localT * 180)}, ${70 + localT * 20}%, ${50 + localT * 40}%)`;
                } else {
                    const localT = (tClamped - 0.5) * 2;
                    return `hsl(${60 - (localT * 60)}, ${90 + localT * 10}%, ${90 - localT * 40}%)`;
                }
            } else {
                const hue = (1 - tClamped) * 120;
                return `hsl(${hue}, 85%, 45%)`;
            }
        };

        this.bubbleLayer = L.layerGroup();

        monthlyData.forEach(d => {
            if (d.lat && d.lon && d[fuel]) {
                const price = d[fuel];
                const bounds = [
                    [d.lat, d.lon],
                    [d.lat + GRID_STEP, d.lon + GRID_STEP]
                ];
                const centerLat = d.lat + (GRID_STEP / 2);
                const centerLon = d.lon + (GRID_STEP / 2);

                if (this.isInsideGermany(centerLat, centerLon)) {
                    const rect = L.rectangle(bounds, {
                        color: "transparent",
                        weight: 0,
                        fillColor: getColor(price),
                        fillOpacity: 0.65,
                        interactive: true,
                        data: d // Store for click
                    });

                    rect.bindTooltip(`
                        <div style="text-align:center">
                            <strong>${price.toFixed(3)} €</strong>
                        </div>
                    `, { direction: 'top', opacity: 0.9, offset: [0, -5] });

                    rect.on('click', () => {
                        if (this.options.onRegionSelect) {
                            this.options.onRegionSelect(d);
                        }
                    });

                    this.bubbleLayer.addLayer(rect);
                }
            }
        });

        this.bubbleLayer.addTo(this.map);

        // --- Legend ---
        if (this.legend) this.map.removeControl(this.legend);

        this.legend = L.control({ position: 'bottomright' });
        this.legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'info legend');

            // Minimal Box Styling
            div.style.backgroundColor = 'white';
            div.style.padding = '8px 10px';
            div.style.borderRadius = '5px';
            div.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
            div.style.fontFamily = 'sans-serif';
            div.style.width = '210px';

            // Dynamic Gradient
            let gradientCss;
            if (this.options.colorMode === 'accessible') {
                gradientCss = `background: linear-gradient(to right, hsl(240, 70%, 50%), hsl(60, 90%, 90%), hsl(0, 100%, 50%));`;
            } else {
                gradientCss = `background: linear-gradient(to right, hsl(120, 85%, 45%), hsl(0, 85%, 45%));`;
            }
            const grad = `${gradientCss} height: 8px; width: 100%; border-radius: 4px; margin: 5px 0;`;

            // Inline CSS
            const css = `
                <style>
                    /* Desaturated German Map: 60% Saturation */
                    .bw-tiles { filter: saturate(60%) brightness(105%) contrast(95%) opacity(0.75); }
                    .lg-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
                    .lg-title { font-size: 11px; font-weight: bold; white-space: nowrap; color: #333; }
                    .lg-icon { cursor: help; color: #999; font-size: 12px; position: relative; }
                    .lg-tip {
                        visibility: hidden; width: 200px; background-color: rgba(50,50,50,0.95); color: #fff;
                        text-align: left; border-radius: 4px; padding: 10px; position: absolute;
                        z-index: 9999; bottom: 150%; right: -10px; opacity: 0; transition: opacity 0.2s;
                        font-size: 11px; line-height: 1.4; font-weight: normal; pointer-events: none;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                    }
                    .lg-icon:hover .lg-tip { visibility: visible; opacity: 1; }
                    .lg-tip::after {
                        content: ""; position: absolute; top: 100%; right: 14px;
                        border-width: 5px; border-style: solid;
                        border-color: rgba(50,50,50,0.95) transparent transparent transparent;
                    }
                </style>
            `;

            div.innerHTML = css + `
                <div class="lg-head" style="align-items:flex-start">
                    <div class="lg-title" style="white-space:normal; line-height:1.2">
                        Preisniveau ${this.options.year}<br>
                        <span style="font-weight:normal; font-size:12px; color:#555">(10.–90. Perzentil, DE-weit)</span>
                    </div>
                    <span class="lg-icon" style="margin-top:2px">ⓘ
                        <div class="lg-tip">
                            <strong>Farbskala ${this.options.colorMode === 'accessible' ? '(Barrierefrei)' : ''}</strong><br>
                            <span style="opacity:0.9; margin-top:3px; display:block">
                                10. bis 90. Perzentil der Jahresdaten ${this.options.year}.
                            </span>
                        </div>
                    </span>
                </div>
                <div style="${grad}"></div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: #666;">
                    <span>${min.toFixed(2)}€</span>
                    <span>${max.toFixed(2)}€</span>
                </div>
            `;
            return div;
        };
        this.legend.addTo(this.map);

        // Fit bounds
        if (!this.initialFit) {
            this.map.fitBounds(this.bgLayer.getBounds());
            this.initialFit = true;
        }

        // Restore highlights if needed
        this.updateHighlights();
    }

    // New: Highlight specific regions (for Comparison)
    highlightRegions(selectionList) {
        this.currentHighlights = selectionList;
        this.updateHighlights();
    }

    updateHighlights() {
        if (this.highlightLayer) this.map.removeLayer(this.highlightLayer);
        if (!this.currentHighlights || this.currentHighlights.length === 0) return;

        this.highlightLayer = L.layerGroup().addTo(this.map);
        const GRID_STEP = 0.1;

        this.currentHighlights.forEach(sel => {
            const d = sel.data;
            if (!d) return;
            const bounds = [
                [d.lat, d.lon],
                [d.lat + GRID_STEP, d.lon + GRID_STEP]
            ];
            // Use black color with thicker weight as requested
            const color = '#000000';

            L.rectangle(bounds, {
                color: color, weight: 4, fillColor: 'transparent', dashArray: null
            }).addTo(this.highlightLayer);
        });
    }

    // Ray-Casting Algorithm
    isInsideGermany(lat, lon) {
        if (!this.geoJson) return true;
        const pt = [lon, lat];

        for (const feature of this.geoJson.features) {
            const geometry = feature.geometry;
            if (geometry.type === 'Polygon') {
                if (this.pointInPolygon(pt, geometry.coordinates[0])) return true;
            } else if (geometry.type === 'MultiPolygon') {
                for (const polygon of geometry.coordinates) {
                    if (this.pointInPolygon(pt, polygon[0])) return true;
                }
            }
        }
        return false;
    }

    pointInPolygon(point, vs) {
        const x = point[0], y = point[1];
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i][0], yi = vs[i][1];
            const xj = vs[j][0], yj = vs[j][1];

            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    getStateFromCoordinates(lat, lon) {
        if (!this.geoJson) return null;
        const pt = [lon, lat]; // GeoJSON uses [Lon, Lat]

        for (const feature of this.geoJson.features) {
            const geometry = feature.geometry;
            const props = feature.properties;
            const name = props.GEN || props.name || props.NAME; // Try common property names

            if (geometry.type === 'Polygon') {
                if (this.pointInPolygon(pt, geometry.coordinates[0])) return name;
            } else if (geometry.type === 'MultiPolygon') {
                for (const polygon of geometry.coordinates) {
                    if (this.pointInPolygon(pt, polygon[0])) return name;
                }
            }
        }
        return null;
    }

    update(fuelType, month) {
        this.options.fuelType = fuelType;
        if (month) this.options.month = month;
        this.renderLayer();
    }
}
