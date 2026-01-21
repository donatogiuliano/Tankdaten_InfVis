export class CrisisChart {
    constructor(container, events) {
        this.container = container;
        this.events = events || [];
    }

    update(data, selectedFuel) {
        if (!data) return;

        this.container.innerHTML = '';

        const fuelData = data.filter(d => d.fuel === selectedFuel);

        // Ensure parsing (safeguard if not parsed yet, though page usually does it)
        const parseDate = d3.timeParse('%Y-%m-%d');
        fuelData.forEach(d => {
            if (!d.parsedDate) d.parsedDate = parseDate(d.date);
        });
        fuelData.sort((a, b) => a.parsedDate - b.parsedDate);

        const margin = { top: 40, right: 70, bottom: 50, left: 70 };
        const containerWidth = this.container.clientWidth || 800;
        const containerHeight = this.container.clientHeight || 400;
        const width = Math.max(containerWidth - margin.left - margin.right, 400);
        const height = Math.max(containerHeight - margin.top - margin.bottom, 300);

        const svg = d3.select(this.container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

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

        svg.append('g')
            .attr('class', 'grid')
            .style('stroke', '#eee')
            .style('stroke-dasharray', '3,3')
            .call(d3.axisLeft(yPrice).ticks(6).tickSize(-width).tickFormat(''));

        this.events.forEach((event, index) => {
            const eventDate = parseDate(event.date);
            const xPos = x(eventDate);
            const yOffset = index % 2 === 0 ? -12 : -28;

            if (event.label !== 'Preis-Tief') {
                svg.append('line')
                    .attr('x1', xPos)
                    .attr('x2', xPos)
                    .attr('y1', yOffset + 8)
                    .attr('y2', height)
                    .attr('stroke', '#37474f')
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '4,4')
                    .style('opacity', 1);
            }

            svg.append('text')
                .attr('x', xPos)
                .attr('y', yOffset)
                .attr('text-anchor', 'middle')
                .attr('font-size', '10px')
                .attr('fill', event.color)
                .attr('font-weight', '600')
                .text(`${event.icon} ${event.label}`);
        });

        const areaOil = d3.area()
            .x(d => x(d.parsedDate))
            .y0(height)
            .y1(d => yOil(d.brent_oil_eur))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(fuelData)
            .attr('fill', 'rgba(84, 110, 122, 0.15)')
            .attr('d', areaOil);

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

        const prices = fuelData.map(d => d.price_mean);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const minEntry = fuelData.find(d => d.price_mean === minPrice);
        const maxEntry = fuelData.find(d => d.price_mean === maxPrice);

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
                .attr('y', yPrice(minEntry.price_mean) - 15)
                .attr('text-anchor', 'middle')
                .attr('font-size', '10px')
                .attr('fill', '#009688')
                .attr('font-weight', '700')
                .text('📉 ' + minEntry.price_mean.toFixed(3) + ' €');
        }

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

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat('%b')))
            .selectAll('text')
            .style('font-size', '11px');

        svg.append('g')
            .call(d3.axisLeft(yPrice).ticks(6).tickFormat(d => d.toFixed(2) + ' €'))
            .selectAll('text')
            .style('font-size', '11px');

        svg.append('g')
            .attr('transform', `translate(${width},0)`)
            .call(d3.axisRight(yOil).ticks(5).tickFormat(d => d.toFixed(0) + ' €'))
            .selectAll('text')
            .style('font-size', '11px')
            .style('fill', '#546E7A');

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
            .attr('fill', '#546E7A')
            .text('Rohölpreis Brent (€/Barrel)');

        // Tooltip logic
        // We attach to body or container. Let's try container.
        let tooltip = d3.select(this.container).select('.tooltip-corona');
        if (tooltip.empty()) {
            tooltip = d3.select(this.container)
                .append('div')
                .attr('class', 'tooltip-corona')
                .style('display', 'none');
        }

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
}
