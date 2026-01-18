
import { COLORS } from './colors.js';

export class LineChart {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.data = [];
        this.margin = { top: 20, right: 30, bottom: 30, left: 50 };
        this.options = options;

        // Setup Resize Observer
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);

        this.init();
    }

    init() {
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('class', 'chart-svg')
            .style('width', '100%')
            .style('height', '100%');

        this.g = this.svg.append('g');

        // Axes groups
        this.xAxisG = this.g.append('g').attr('class', 'axis x-axis');
        this.yAxisG = this.g.append('g').attr('class', 'axis y-axis');

        // Paths
        this.areaPath = this.g.append('path').attr('class', 'area').attr('fill', COLORS.fuel.e10).attr('opacity', 0.1);
        this.linePath = this.g.append('path').attr('class', 'line').attr('fill', 'none').attr('stroke-width', 2);
        this.maPath = this.g.append('path').attr('class', 'ma-line').attr('fill', 'none').attr('stroke-width', 2).attr('stroke-dasharray', '5,5');

        // Tooltip Overlay
        this.overlay = this.g.append('rect')
            .attr('class', 'overlay')
            .attr('fill', 'transparent')
            .on('mousemove', (e) => this.onMouseMove(e))
            .on('mouseout', () => this.hideTooltip());

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

        this.focusLine = this.g.append('line')
            .attr('stroke', COLORS.textMuted)
            .attr('stroke-width', 1)
            .style('opacity', 0);
    }

    update(data) {
        this.data = data;
        this.draw();
    }

    resize() {
        if (!this.data.length) return;
        this.draw();
    }

    draw() {
        const rect = this.container.getBoundingClientRect();
        const width = rect.width - this.margin.left - this.margin.right;
        const height = rect.height - this.margin.top - this.margin.bottom;

        this.g.attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        this.overlay.attr('width', width).attr('height', height);

        // Scales
        this.xScale = d3.scaleTime()
            .domain(d3.extent(this.data, d => new Date(d.date)))
            .range([0, width]);

        this.yScale = d3.scaleLinear()
            .domain([
                d3.min(this.data, d => d.price_min) * 0.99,
                d3.max(this.data, d => d.price_max) * 1.01
            ])
            .range([height, 0]);

        // Generators
        const line = d3.line()
            .x(d => this.xScale(new Date(d.date)))
            .y(d => this.yScale(d.price_mean))
            .curve(d3.curveMonotoneX);

        const maLine = d3.line()
            .x(d => this.xScale(new Date(d.date)))
            .y(d => this.yScale(d.ma_7d || d.price_mean)) // Fallback
            .curve(d3.curveMonotoneX);

        const area = d3.area()
            .x(d => this.xScale(new Date(d.date)))
            .y0(d => this.yScale(d.price_min))
            .y1(d => this.yScale(d.price_max))
            .curve(d3.curveMonotoneX);

        // Update elements
        const color = COLORS.fuel[this.options.fuelType] || COLORS.primary;

        this.linePath
            .datum(this.data)
            .attr('d', maLine) // Show MA as main line
            .attr('stroke', color);

        this.areaPath
            .datum(this.data)
            .attr('d', area)
            .attr('fill', color);

        // Axes
        this.xAxisG.attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(this.xScale).ticks(5).tickFormat(d3.timeFormat('%d.%m')));

        this.yAxisG.call(d3.axisLeft(this.yScale).ticks(5).tickFormat(d => d + ' €'));

        // Annotations (Events)
        if (this.options.annotations) {
            const annotations = this.g.selectAll('.annotation').data(this.options.annotations);

            const enter = annotations.enter().append('g').attr('class', 'annotation');

            enter.append('line')
                .attr('y1', 0).attr('y2', height)
                .attr('stroke', d => d.color || COLORS.danger)
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '4,4');

            enter.append('text')
                .text(d => d.label)
                .attr('y', 10)
                .attr('fill', d => d.color || COLORS.danger)
                .style('font-size', '0.75rem')
                .style('font-weight', 'bold');

            enter.merge(annotations)
                .attr('transform', d => {
                    const x = this.xScale(new Date(d.date));
                    return `translate(${x},0)`;
                });

            annotations.exit().remove();
        }

        // Style axes
        this.svg.selectAll('.domain, .tick line').attr('stroke', COLORS.grid);
        this.svg.selectAll('text').attr('fill', COLORS.textMuted);
    }

    onMouseMove(event) {
        if (!this.data.length) return;

        const [xPos] = d3.pointer(event);
        const date = this.xScale.invert(xPos);
        const bisect = d3.bisector(d => new Date(d.date)).left;
        const index = bisect(this.data, date);
        const d = this.data[index] || this.data[index - 1];

        if (!d) return;

        const x = this.xScale(new Date(d.date));
        const y = this.yScale(d.price_mean);

        this.focusLine
            .attr('x1', x).attr('x2', x)
            .attr('y1', 0).attr('y2', this.yScale.range()[0])
            .style('opacity', 1);

        this.tooltip
            .style('opacity', 1)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .html(`
                <div style="font-weight:bold; margin-bottom:5px;">${d.date}</div>
                <div>Ø Preis: <b>${d.price_mean.toFixed(3)} €</b></div>
                <div style="font-size:0.9em; color:${COLORS.textMuted}">Min: ${d.price_min.toFixed(3)} € | Max: ${d.price_max.toFixed(3)} €</div>
            `);
    }

    hideTooltip() {
        this.tooltip.style('opacity', 0);
        this.focusLine.style('opacity', 0);
    }

    destroy() {
        this.resizeObserver.disconnect();
        this.svg.remove();
        this.tooltip.remove();
    }
}
