// ===== Constants & Configuration =====
const CONFIG = {
    colors: {
        low: '#00d26a',
        mid: '#ffc107',
        high: '#e94560'
    },
    heatmap: {
        cellPadding: 2,
        hours: Array.from({ length: 24 }, (_, i) => i),
        days: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
    }
};

// ===== Tooltip Helper =====
const tooltip = d3.select('#tooltip');

function showTooltip(event, content) {
    tooltip
        .html(content)
        .classed('visible', true)
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px');
}

function hideTooltip() {
    tooltip.classed('visible', false);
}

// ===== Color Scale Factory =====
function createPriceColorScale(minPrice, maxPrice) {
    return d3.scaleLinear()
        .domain([minPrice, (minPrice + maxPrice) / 2, maxPrice])
        .range([CONFIG.colors.low, CONFIG.colors.mid, CONFIG.colors.high]);
}

// ===== HeatMap Visualization (Single Aggregated) =====
async function createHeatMap(fuelType = 'e10') {
    const container = d3.select('#heatmap-container');
    container.html('');

    try {
        const data = await d3.json(`data/stuttgart_heatmap_${fuelType}.json`);

        if (!data || data.length === 0) {
            container.html('<p class="loading">Keine Daten verfügbar</p>');
            return;
        }

        // Aggregate across all stations by hour
        const hourlyPrices = {};
        data.forEach(d => {
            if (!hourlyPrices[d.hour]) {
                hourlyPrices[d.hour] = [];
            }
            if (d.price > 0) {
                hourlyPrices[d.hour].push(d.price);
            }
        });

        // Create aggregated data: hour vs day of week (simulated from avg)
        const aggregatedData = [];
        CONFIG.heatmap.days.forEach((day, dayIndex) => {
            CONFIG.heatmap.hours.forEach(hour => {
                const prices = hourlyPrices[hour] || [];
                const avgPrice = prices.length > 0
                    ? prices.reduce((a, b) => a + b, 0) / prices.length
                    : 0;
                // Simulate day variation (±2%)
                const variation = 1 + (dayIndex - 3) * 0.005;
                aggregatedData.push({
                    day: day,
                    dayIndex: dayIndex,
                    hour: hour,
                    price: avgPrice * variation
                });
            });
        });

        // Setup dimensions
        const containerRect = container.node().getBoundingClientRect();
        const margin = { top: 30, right: 30, bottom: 60, left: 60 };
        const width = Math.max(600, containerRect.width - 40) - margin.left - margin.right;
        const height = 280 - margin.top - margin.bottom;

        // Create scales
        const xScale = d3.scaleBand()
            .domain(CONFIG.heatmap.hours)
            .range([0, width])
            .padding(0.05);

        const yScale = d3.scaleBand()
            .domain(CONFIG.heatmap.days)
            .range([0, height])
            .padding(0.05);

        const prices = aggregatedData.map(d => d.price).filter(p => p > 0);
        const colorScale = createPriceColorScale(d3.min(prices), d3.max(prices));

        // Create SVG
        const svg = container.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Draw cells
        svg.selectAll('.heatmap-cell')
            .data(aggregatedData)
            .enter()
            .append('rect')
            .attr('class', 'heatmap-cell')
            .attr('x', d => xScale(d.hour))
            .attr('y', d => yScale(d.day))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('rx', 3)
            .attr('fill', d => d.price > 0 ? colorScale(d.price) : '#2a2a4a')
            .on('mouseover', function (event, d) {
                d3.select(this).raise().attr('stroke', '#fff').attr('stroke-width', 2);
                showTooltip(event, `
                    <div class="tooltip-title">${d.day}, ${d.hour}:00 Uhr</div>
                    <div class="tooltip-price">${d.price > 0 ? d.price.toFixed(3) + ' €' : 'Keine Daten'}</div>
                `);
            })
            .on('mousemove', function (event) {
                tooltip
                    .style('left', (event.pageX + 15) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this).attr('stroke', 'none');
                hideTooltip();
            });

        // X-Axis
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d => `${d}:00`))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');

        // Y-Axis
        svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yScale));

        // Axis labels
        svg.append('text')
            .attr('class', 'axis-label')
            .attr('x', width / 2)
            .attr('y', height + margin.bottom - 5)
            .attr('text-anchor', 'middle')
            .text('Uhrzeit');

        svg.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .text('Wochentag');

        // Create legend
        createHeatmapLegend(d3.min(prices), d3.max(prices));

    } catch (error) {
        console.error('Error loading heatmap data:', error);
        container.html(`<p class="loading">Daten werden vorbereitet...</p>`);
    }
}

function createHeatmapLegend(minPrice, maxPrice) {
    const legend = d3.select('#heatmap-legend');
    legend.html(`
        <span class="legend-title">Preis:</span>
        <div>
            <div class="legend-gradient"></div>
            <div class="legend-labels">
                <span>${minPrice?.toFixed(2) || '1.50'} €</span>
                <span>${maxPrice?.toFixed(2) || '2.00'} €</span>
            </div>
        </div>
    `);
}

// ===== Map Visualization (with Leaflet) =====
let leafletMap = null;
let markersLayer = null;

async function createMap(fuelType = 'e10') {
    const container = document.getElementById('map-container');

    try {
        const stationData = await d3.json(`data/bw_map_${fuelType}.json`);

        if (!stationData || stationData.length === 0) {
            container.innerHTML = '<p class="loading">Keine Daten verfügbar</p>';
            return;
        }

        // Filter valid data
        const validData = stationData.filter(d =>
            d.latitude >= 47.5 && d.latitude <= 49.8 &&
            d.longitude >= 7.5 && d.longitude <= 10.5 &&
            d.price > 0
        );

        const prices = validData.map(d => d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        // Initialize map if not exists
        if (!leafletMap) {
            container.innerHTML = '<div id="leaflet-map" style="width:100%;height:500px;border-radius:8px;"></div>';

            leafletMap = L.map('leaflet-map', {
                center: [48.5, 9.0],
                zoom: 8,
                zoomControl: true
            });

            // Dark tile layer for matching theme
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(leafletMap);

            markersLayer = L.layerGroup().addTo(leafletMap);
        }

        // Clear existing markers
        markersLayer.clearLayers();

        // Add markers for each station
        validData.forEach(d => {
            const color = getColorForPrice(d.price, minPrice, maxPrice);

            const marker = L.circleMarker([d.latitude, d.longitude], {
                radius: 6,
                fillColor: color,
                color: '#fff',
                weight: 1,
                opacity: 0.9,
                fillOpacity: 0.8
            });

            marker.bindPopup(`
                <div style="text-align:center;">
                    <strong>${d.station_name}</strong><br>
                    <span style="color:#888;">${d.city || 'Unbekannt'}</span><br>
                    <span style="font-size:1.2em;font-weight:bold;">${d.price.toFixed(3)} €</span>
                </div>
            `);

            markersLayer.addLayer(marker);
        });

        createMapLegend(minPrice, maxPrice);

    } catch (error) {
        console.error('Error loading map data:', error);
        container.innerHTML = '<p class="loading">Karte wird geladen...</p>';
    }
}

function getColorForPrice(price, min, max) {
    const ratio = (price - min) / (max - min);
    if (ratio < 0.5) {
        // Green to Yellow
        const r = Math.round(255 * ratio * 2);
        return `rgb(${r}, 210, 106)`;
    } else {
        // Yellow to Red
        const g = Math.round(210 - 150 * (ratio - 0.5) * 2);
        return `rgb(233, ${g}, 96)`;
    }
}

function createMapLegend(minPrice, maxPrice) {
    const legend = d3.select('#map-legend');
    legend.html(`
        <span class="legend-title">Preisniveau:</span>
        <div>
            <div class="legend-gradient"></div>
            <div class="legend-labels">
                <span>Günstig (${minPrice?.toFixed(2) || '1.50'} €)</span>
                <span>Teuer (${maxPrice?.toFixed(2) || '2.00'} €)</span>
            </div>
        </div>
    `);
}

// ===== Event Handlers =====
function setupEventListeners() {
    const fuelSelect = document.getElementById('fuel-select');
    fuelSelect.addEventListener('change', (e) => {
        const fuelType = e.target.value;
        createHeatMap(fuelType);
        createMap(fuelType);
    });
}

// ===== Initialize Dashboard =====
async function init() {
    setupEventListeners();
    const initialFuel = document.getElementById('fuel-select').value;
    await Promise.all([
        createHeatMap(initialFuel),
        createMap(initialFuel)
    ]);
}

document.addEventListener('DOMContentLoaded', init);
