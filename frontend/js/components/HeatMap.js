
import { COLORS } from './colors.js';

export class HeatMap {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.data = [];
        this.margin = { top: 30, right: 30, bottom: 60, left: 60 };
        this.options = options;

        // Setup Resize Observer
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);

        this.init();
    }

    init() {
        this.div = d3.select(this.container);
        this.svg = this.div.append('svg')
            .attr('class', 'chart-svg');

        this.g = this.svg.append('g');

        // Axis
        this.xAxisG = this.g.append('g').attr('class', 'axis x-axis');
        this.yAxisG = this.g.append('g').attr('class', 'axis y-axis');

        // Legend Container
        this.legendG = this.svg.append('g').attr('class', 'legend');

        // Tooltip
        this.tooltip = d3.select('body').append('div')
            .attr('class', 'chart-tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background', COLORS.tooltipBg)
            .style('border', `1px solid ${COLORS.tooltipBorder}`)
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('pointer-events', 'none')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');
    }

    update(data) {
        // Aggregate raw single-station data to mean per hour per day (if needed)
        // Or assume data is already aggregated.
        // For compatibility with app.js legacy format:
        this.data = this._processData(data);
        this.draw();
    }

    _processData(rawData) {
        // Convert [ {hour, price} ] or similar to [ {day, hour, price} ]
        // Using logic from original app.js to simulate week-days from flattened data if necessary
        // Or expect prepared data. 
        // For now, assuming rawData is the heatmap_*.json format which lacks day info, 
        // so we use the simulation logic from app.js
        if (!rawData || rawData.length === 0) return [];

        const hourlyPrices = {};
        rawData.forEach(d => {
            if (!hourlyPrices[d.hour]) hourlyPrices[d.hour] = [];
            if (d.price > 0) hourlyPrices[d.hour].push(d.price);
        });

        const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const aggregated = [];

        days.forEach((day, dayIndex) => {
            hours.forEach(hour => {
                const prices = hourlyPrices[hour] || [];
                const avg = prices.length ? prices.reduce((a, b) => a + b) / prices.length : 0;
                // Simulating variation
                const variation = 1 + (dayIndex - 3) * 0.005;
                aggregated.push({
                    day,
                    dayIndex,
                    hour,
                    price: avg * variation
                });
            });
        });

        return aggregated;
    }

    resize() {
        if (!this.data.length) return;
        this.draw();
    }

    draw() {
        const rect = this.container.getBoundingClientRect();
        const width = Math.max(400, rect.width - this.margin.left - this.margin.right);
        const height = Math.max(300, rect.height - this.margin.top - this.margin.bottom);

        this.svg.attr('width', '100%').attr('height', '100%')
            .attr('viewBox', `0 0 ${rect.width} ${rect.height}`); // Responsive scaling

        this.g.attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Scales
        const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
        const hours = Array.from({ length: 24 }, (_, i) => i);

        const xScale = d3.scaleBand()
            .domain(hours)
            .range([0, width])
            .padding(0.05);

        const yScale = d3.scaleBand()
            .domain(days)
            .range([0, height])
            .padding(0.05);

        const prices = this.data.map(d => d.price).filter(p => p > 0);
        const colorScale = d3.scaleLinear()
            .domain([d3.min(prices), d3.mean(prices), d3.max(prices)])
            .range([COLORS.success, COLORS.warning, COLORS.danger]);

        // Cells
        const cells = this.g.selectAll('rect').data(this.data);

        cells.enter().append('rect')
            .merge(cells)
            .attr('x', d => xScale(d.hour))
            .attr('y', d => yScale(d.day))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('rx', 4)
            .attr('fill', d => d.price > 0 ? colorScale(d.price) : '#eee')
            .on('mouseover', (event, d) => {
                this.tooltip.style('opacity', 1)
                    .html(`
                        <b>${d.day}, ${d.hour}:00</b><br>
                        ${d.price.toFixed(3)} €
                    `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', () => {
                this.tooltip.style('opacity', 0);
            });

        cells.exit().remove();

        // Axes
        this.xAxisG.attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d => `${d}h`));

        this.yAxisG.call(d3.axisLeft(yScale));

        // Remove axis lines for cleaner look
        this.g.selectAll('.domain').remove();
    }

    destroy() {
        this.resizeObserver.disconnect();
        this.svg.remove();
        this.tooltip.remove();
    }
}
