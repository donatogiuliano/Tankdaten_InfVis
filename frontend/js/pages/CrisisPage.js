
export class CrisisPage {
    constructor() {
        this.data = null;
        this.selectedFuel = 'e10';
        this.resizeObserver = null;
    }

    async render(container) {
        this.container = container;
        
        // Corona-Event Markers
        this.coronaEvents = [
            { date: '2020-03-22', label: '1. Lockdown', color: '#e53935', icon: '🔒' },
            { date: '2020-05-06', label: 'Lockerungen', color: '#4caf50', icon: '🔓' },
            { date: '2020-11-02', label: '2. Lockdown', color: '#e53935', icon: '🔒' }
        ];

        container.innerHTML = `
            <div class="corona-page" style="padding: 1.5rem; height: 100%; display: flex; flex-direction: column; box-sizing: border-box;">
                
                <!-- Header -->
                <div style="margin-bottom: 1rem;">
                    <h1 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.8rem;">🦠</span> Corona-Krisenanalyse 2020
                    </h1>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;">
                        Auswirkungen der COVID-19 Pandemie auf die Kraftstoffpreise in Deutschland
                    </p>
                </div>

                <!-- Controls -->
                <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap;">
                    <div style="display: flex; gap: 0.5rem; background: #f0f2f5; padding: 4px; border-radius: 8px;">
                        <button class="fuel-btn active" data-fuel="e5" style="border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;">Super E5</button>
                        <button class="fuel-btn" data-fuel="e10" style="border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;">E10</button>
                        <button class="fuel-btn" data-fuel="diesel" style="border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;">Diesel</button>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-left: auto;">
                        ${this.coronaEvents.map(e => `
                            <div style="display: flex; align-items: center; gap: 4px; font-size: 0.95rem; color: #5f6368; font-weight: 500;">
                                <span style="width: 12px; height: 12px; background: ${e.color}; border-radius: 3px;"></span>
                                ${e.icon} ${e.label}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Chart Container -->
                <div class="chart-card" style="flex: 1; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 1.5rem; display: flex; flex-direction: column; min-height: 400px;">
                    <div id="corona-chart" style="flex: 1; position: relative;">
                        <div class="loading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                            <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #333; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                            <p>Lade Corona-Daten...</p>
                        </div>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div id="stats-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                </div>
            </div>
            
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .fuel-btn:hover { background: rgba(0,0,0,0.05); }
                .fuel-btn.active { background: #333; color: white; }
                .stat-card { background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
                .stat-card .label { font-size: 0.75rem; color: #888; text-transform: uppercase; margin-bottom: 0.25rem; }
                .stat-card .value { font-size: 1.5rem; font-weight: 700; }
                .tooltip-corona { position: absolute; background: rgba(0,0,0,0.85); color: white; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; pointer-events: none; z-index: 100; }
            </style>
        `;

        this.initEvents();
        await this.loadData();
    }

    initEvents() {
        const fuelBtns = this.container.querySelectorAll('.fuel-btn');
        fuelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                fuelBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedFuel = btn.dataset.fuel;
                this.renderChart();
                this.renderStats();
            });
        });
    }

    async loadData() {
        try {
            const response = await fetch('/api/data/corona');
            if (!response.ok) throw new Error('Daten nicht gefunden');
            this.data = await response.json();
            
            // Wait for DOM to be fully rendered before drawing chart
            requestAnimationFrame(() => {
                setTimeout(() => {
                    this.renderChart();
                    this.renderStats();
                    
                    // Add resize observer to re-render on container size change
                    if (!this.resizeObserver) {
                        this.resizeObserver = new ResizeObserver(() => {
                            if (this.data) {
                                this.renderChart();
                            }
                        });
                        const chartContainer = this.container.querySelector('#corona-chart');
                        if (chartContainer) {
                            this.resizeObserver.observe(chartContainer);
                        }
                    }
                }, 200); // Increased timeout for proper sizing
            });
        } catch (e) {
            console.error(e);
            this.container.querySelector('#corona-chart').innerHTML = `
                <div style="text-align: center; color: #e53935; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <p>Fehler beim Laden: ${e.message}</p>
                </div>
            `;
        }
    }

    renderChart() {
        if (!this.data) return;

        const chartContainer = this.container.querySelector('#corona-chart');
        chartContainer.innerHTML = '';

        // Filter data for selected fuel
        const fuelData = this.data.filter(d => d.fuel === this.selectedFuel);
        
        // Parse dates and sort
        const parseDate = d3.timeParse('%Y-%m-%d');
        fuelData.forEach(d => {
            d.parsedDate = parseDate(d.date);
        });
        fuelData.sort((a, b) => a.parsedDate - b.parsedDate);

        // Dimensions - use fallback values if container has no size yet
        const margin = { top: 40, right: 70, bottom: 50, left: 70 };
        const containerWidth = chartContainer.clientWidth || 800;
        const containerHeight = chartContainer.clientHeight || 400;
        const width = Math.max(containerWidth - margin.left - margin.right, 400);
        const height = Math.max(containerHeight - margin.top - margin.bottom, 300);

        // Create SVG
        const svg = d3.select(chartContainer)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleTime()
            .domain(d3.extent(fuelData, d => d.parsedDate))
            .range([0, width]);

        const yPrice = d3.scaleLinear()
            .domain([
                d3.min(fuelData, d => d.price_mean) * 0.95,
                d3.max(fuelData, d => d.price_mean) * 1.05
            ])
            .range([height, 0]);

        const yOil = d3.scaleLinear()
            .domain([0, d3.max(fuelData, d => d.brent_oil_eur) * 1.1])
            .range([height, 0]);

        // Gridlines
        svg.append('g')
            .attr('class', 'grid')
            .style('stroke', '#eee')
            .style('stroke-dasharray', '3,3')
            .call(d3.axisLeft(yPrice).ticks(6).tickSize(-width).tickFormat(''));

        // Corona Event Markers
        this.coronaEvents.forEach((event, index) => {
            const eventDate = parseDate(event.date);
            const xPos = x(eventDate);
            
            // Stagger Y position to avoid overlap (alternate between -10 and -25)
            const yOffset = index % 2 === 0 ? -12 : -28;
            
            // Vertical Line (Exclude for Price-Tief)
            if (event.label !== 'Preis-Tief') {
                svg.append('line')
                    .attr('x1', xPos)
                    .attr('x2', xPos)
                    .attr('y1', yOffset + 8)
                    .attr('y2', height)
                    .attr('stroke', '#37474f') // Dark Slate Grey (High Contrast)
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '4,4')
                    .style('opacity', 1);
            }
            
            // Label (Keep original color for readability)
            svg.append('text')
                .attr('x', xPos)
                .attr('y', yOffset)
                .attr('text-anchor', 'middle')
                .attr('font-size', '10px')
                .attr('fill', event.color)
                .attr('font-weight', '600')
                .text(`${event.icon} ${event.label}`);
        });

        // Oil Price Area (Slate Grey)
        const areaOil = d3.area()
            .x(d => x(d.parsedDate))
            .y0(height)
            .y1(d => yOil(d.brent_oil_eur))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(fuelData)
            .attr('fill', 'rgba(84, 110, 122, 0.15)') // #546E7A at 15%
            .attr('d', areaOil);

        // Main Price Line
        const line = d3.line()
            .x(d => x(d.parsedDate))
            .y(d => yPrice(d.price_mean))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(fuelData)
            .attr('fill', 'none')
            .attr('stroke', '#1e88e5')
            .attr('stroke-width', 3)
            .attr('d', line);

        // Find min/max prices for markers
        const prices = fuelData.map(d => d.price_mean);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const minEntry = fuelData.find(d => d.price_mean === minPrice);
        const maxEntry = fuelData.find(d => d.price_mean === maxPrice);

        // Min Price Marker (Teal)
        if (minEntry) {
            svg.append('circle')
                .attr('cx', x(minEntry.parsedDate))
                .attr('cy', yPrice(minEntry.price_mean))
                .attr('r', 8)
                .attr('fill', '#009688')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);
            svg.append('text')
                .attr('x', x(minEntry.parsedDate))
                .attr('y', yPrice(minEntry.price_mean) - 15) // Position ABOVE point
                .attr('text-anchor', 'middle')
                .attr('font-size', '10px')
                .attr('fill', '#009688')
                .attr('font-weight', '700')
                .text('📉 ' + minEntry.price_mean.toFixed(3) + ' €');
        }

        // Max Price Marker (Purple)
        if (maxEntry) {
            svg.append('circle')
                .attr('cx', x(maxEntry.parsedDate))
                .attr('cy', yPrice(maxEntry.price_mean))
                .attr('r', 8)
                .attr('fill', '#9c27b0')
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);
            svg.append('text')
                .attr('x', x(maxEntry.parsedDate))
                .attr('y', yPrice(maxEntry.price_mean) - 12)
                .attr('text-anchor', 'middle')
                .attr('font-size', '10px')
                .attr('fill', '#9c27b0')
                .attr('font-weight', '700')
                .text('📈 ' + maxEntry.price_mean.toFixed(3) + ' €');
        }

        // X Axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat('%b')))
            .selectAll('text')
            .style('font-size', '11px');

        // Y Axis Left (Price)
        svg.append('g')
            .call(d3.axisLeft(yPrice).ticks(6).tickFormat(d => d.toFixed(2) + ' €'))
            .selectAll('text')
            .style('font-size', '11px');

        // Y Axis Right (Oil - Slate Grey)
        svg.append('g')
            .attr('transform', `translate(${width},0)`)
            .call(d3.axisRight(yOil).ticks(5).tickFormat(d => d.toFixed(0) + ' €'))
            .selectAll('text')
            .style('font-size', '11px')
            .style('fill', '#546E7A'); // Slate Grey

        // Axis Labels
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -45)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#1e88e5')
            .text('Kraftstoffpreis (€/L)');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', width + 55)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#546E7A') // Slate Grey
            .text('Rohölpreis Brent (€/Barrel)');

        // Interactive Overlay for Tooltip
        const tooltip = d3.select(chartContainer)
            .append('div')
            .attr('class', 'tooltip-corona')
            .style('display', 'none');

        const bisect = d3.bisector(d => d.parsedDate).left;

        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .style('fill', 'none')
            .style('pointer-events', 'all')
            .on('mousemove', (event) => {
                const [mx] = d3.pointer(event);
                const x0 = x.invert(mx);
                const i = bisect(fuelData, x0, 1);
                const d0 = fuelData[i - 1];
                const d1 = fuelData[i];
                const d = d1 && (x0 - d0.parsedDate > d1.parsedDate - x0) ? d1 : d0;
                
                if (d) {
                    tooltip
                        .style('display', 'block')
                        .style('left', (x(d.parsedDate) + margin.left + 10) + 'px')
                        .style('top', (yPrice(d.price_mean) + margin.top - 10) + 'px')
                        .html(`
                            <strong>${d3.timeFormat('%d. %B %Y')(d.parsedDate)}</strong><br>
                            Preis: ${d.price_mean.toFixed(3)} €<br>
                            Öl: ${d.brent_oil_eur.toFixed(2)} €
                        `);
                }
            })
            .on('mouseout', () => tooltip.style('display', 'none'));
    }

    renderStats() {
        if (!this.data) return;

        const fuelData = this.data.filter(d => d.fuel === this.selectedFuel);
        
        // Fuel name mapping
        const fuelNames = { 'e5': 'Super E5', 'e10': 'E10', 'diesel': 'Diesel' };
        const fuelName = fuelNames[this.selectedFuel] || this.selectedFuel.toUpperCase();
        
        // Calculate stats
        const prices = fuelData.map(d => d.price_mean);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const diff = max - min;

        // Find dates for min/max
        const minEntry = fuelData.find(d => d.price_mean === min);
        const maxEntry = fuelData.find(d => d.price_mean === max);

        const statsContainer = this.container.querySelector('#stats-cards');
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="label">📉 Tiefstwert ${fuelName}</div>
                <div class="value" style="color: #009688;">${min.toFixed(3)} €/L</div>
                <div style="font-size: 0.8rem; color: #888;">${minEntry?.date || ''}</div>
            </div>
            <div class="stat-card">
                <div class="label">📈 Höchstwert ${fuelName}</div>
                <div class="value" style="color: #9c27b0;">${max.toFixed(3)} €/L</div>
                <div style="font-size: 0.8rem; color: #888;">${maxEntry?.date || ''}</div>
            </div>
            <div class="stat-card">
                <div class="label">⌀ Jahresdurchschnitt ${fuelName}</div>
                <div class="value">${avg.toFixed(3)} €/L</div>
            </div>
            <div class="stat-card">
                <div class="label">↕️ Schwankung ${fuelName}</div>
                <div class="value">${diff.toFixed(3)} €/L</div>
                <div style="font-size: 0.8rem; color: #888;">${((diff / avg) * 100).toFixed(1)}% vom Durchschnitt</div>
            </div>
        `;
    }

    destroy() {
        // Cleanup resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }
}
