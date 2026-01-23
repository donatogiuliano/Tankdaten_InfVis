export class MarketPhasesChart {
    constructor(container, colors) {
        this.container = container;
        this.colors = colors || {
            fuel: '#1e88e5',                   // Kräftiges Blau
            oil: '#2c3e50',                    // Dunkles Marineblau (fast schwarz)
            band: 'rgba(30, 136, 229, 0.12)',  // Dezenteres Blau für das Band
            phase: {
                'ASYMMETRIE': '#FFB74D',           // Hellorange - Spannung
                'INTERNE_FAKTOREN': '#9575CD'   // Sanftes Violett - Interne Faktoren
            }
        };

        // Create Tooltip if missing
        let tp = d3.select(this.container.parentNode).select('#mp-tooltip');
        if (tp.empty()) {
            tp = d3.select(this.container.parentNode).append('div')
                .attr('id', 'mp-tooltip')
                .style('position', 'absolute')
                .style('display', 'none')
                .style('background', 'rgba(255,255,255,0.95)')
                .style('border', '1px solid #ddd')
                .style('padding', '10px')
                .style('border-radius', '4px')
                .style('box-shadow', '0 2px 8px rgba(0,0,0,0.1)')
                .style('font-size', '0.9em')
                .style('pointer-events', 'none')
                .style('z-index', '100');
        }
        this.tooltip = tp;
    }

    update(data, meta, state, metaData) {
        if (!data || data.length === 0) return;

        this.container.innerHTML = '';

        // Dimensions
        const margin = { top: 20, right: 60, bottom: 30, left: 50 };
        const width = (this.container.clientWidth || 800) - margin.left - margin.right;
        const height = (this.container.clientHeight || 400) - margin.top - margin.bottom;

        const svg = d3.select(this.container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales - extend x-axis to show 2025 label
        const dataExtent = d3.extent(data, d => d.parsedDate);
        const xMax = new Date('2025-01-01'); // End exactly at 2025
        const x = d3.scaleTime()
            .domain([dataExtent[0], xMax])
            .range([0, width]);

        const yFuel = d3.scaleLinear()
            .domain([
                d3.min(data, d => d.price_mean) * 0.95,
                d3.max(data, d => d.price_mean) * 1.05
            ])
            .range([height, 0]);

        // Define dotted patterns for phases


        // Draw Phases Background (Filtered)
        if (meta) {
            // Filter phases based on state
            const visiblePhases = meta.filter(d => {

                if (d.phase === 'ASYMMETRIE') return state.showPhaseAsymmetrie;
                if (d.phase === 'INTERNE_FAKTOREN') return state.showPhaseVolatility;
                return false;
            });

            svg.selectAll('.phase-rect')
                .data(visiblePhases)
                .enter()
                .append('rect')
                .attr('x', d => x(d.startParsed))
                .attr('width', d => Math.max(2, x(d.endParsed) - x(d.startParsed)))
                .attr('y', 0)
                .attr('height', height)
                .attr('fill', d => this.colors.phase[d.phase] || 'transparent')
                .attr('fill-opacity', 0.2)
                .on('mouseover', (e, d) => {
                    this.tooltip.style('display', 'block');
                    const phaseNames = {
                        'ASYMMETRIE': 'Asymmetrie',
                        'INTERNE_FAKTOREN': 'Interne Faktoren'
                    };
                    const descriptions = {
                        'ASYMMETRIE': 'Tankpreise reagieren asymmetrisch auf Ölpreisänderungen',
                        'INTERNE_FAKTOREN': 'Preisänderungen durch regionale oder interne Faktoren'
                    };
                    this.tooltip.html(`
                        <strong>${phaseNames[d.phase] || d.phase}</strong><br>
                        <em style="color: #666; font-size: 0.85em;">${descriptions[d.phase] || ''}</em><br>
                        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #eee;">
                            📅 ${d.start_date} bis ${d.end_date}<br>
                            ⏱️ Dauer: ${d.duration_days} Tage<br>
                            ${d.avg_correlation ? `📊 Ø Korrelation: ${d.avg_correlation.toFixed(2)}<br>` : ''}
                            ${d.avg_lag ? `⏳ Ø Verzögerung: ${d.avg_lag.toFixed(1)} Tage<br>` : ''}
                            ${d.avg_vol_ratio ? `📈 Ø Vol.-Ratio: ${d.avg_vol_ratio.toFixed(2)}` : ''}
                        </div>
                    `);
                })
                .on('mousemove', (e) => {
                    const [mx, my] = d3.pointer(e, this.container.parentNode);
                    this.tooltip.style('left', (mx + 15) + 'px')
                    this.tooltip.style('top', (my + 15) + 'px');
                })
                .on('mouseout', () => {
                    this.tooltip.style('display', 'none');
                });
        }

        // X-Axis (Bottom) - Show years for multi-year view
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat('%Y')))
            .call(g => g.select('.domain').attr('stroke', '#333'))
            .selectAll('text')
            .style('font-size', '11px')
            .style('fill', '#222');

        // Y-Axis (Left)
        svg.append('g')
            .call(d3.axisLeft(yFuel).ticks(5))
            .call(g => g.select('.domain').attr('stroke', '#333'))
            .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.1).attr('x2', width))
            .selectAll('text')
            .style('font-size', '11px')
            .style('fill', '#222');

        // Add Oil Axis if toggled
        if (state.showOil && metaData.oil_available) {
            const yOil = d3.scaleLinear()
                .domain([
                    d3.min(data, d => d.brent_oil_eur) * 0.9,
                    d3.max(data, d => d.brent_oil_eur) * 1.1
                ])
                .range([height, 0]);

            // Oil axis removed - no right Y-axis
            // svg.append('g')
            //     .attr('transform', `translate(${width}, 0)`)
            //     .call(d3.axisRight(yOil).ticks(5))
            //     .call(g => g.selectAll('text').attr('fill', this.colors.oil));

            // Oil Line
            const lineOil = d3.line()
                .defined(d => d.brent_oil_eur !== null)
                .x(d => x(d.parsedDate))
                .y(d => yOil(d.brent_oil_eur))
                .curve(d3.curveMonotoneX);

            svg.append('path')
                .datum(data)
                .attr('fill', 'none')
                .attr('stroke', this.colors.oil)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '4,4')
                .attr('d', lineOil);
        }

        // Fuel Line (MA7)
        const lineFuel = d3.line()
            .defined(d => d.price_ma7 !== null)
            .x(d => x(d.parsedDate))
            .y(d => yFuel(d.price_ma7))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', this.colors.fuel)
            .attr('stroke-width', 3)
            .attr('d', lineFuel);

        // Volatility Band (MA7 +/- StdDev)
        if (state.showBand) {
            const areaBand = d3.area()
                .defined(d => d.price_ma7 !== null && d.price_std !== null)
                .x(d => x(d.parsedDate))
                .y0(d => yFuel(d.price_ma7 - d.price_std))
                .y1(d => yFuel(d.price_ma7 + d.price_std))
                .curve(d3.curveMonotoneX);  // Gleiche Kurve wie Linie

            svg.append('path')
                .datum(data)
                .attr('fill', this.colors.band)
                .attr('stroke', 'none')
                .attr('class', 'volatility-band')
                .attr('d', areaBand);
        }

        // Handling "No Oil Data" Warning
        if (!metaData.oil_available) {
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', '#999')
                .style('font-size', '1.2rem')
                .text('⚠️ Keine Ölpreisdaten für dieses Jahr verfügbar');
        }
    }
}
