
import { COLORS } from './colors.js';

export class BarChart {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.data = [];
        this.margin = { top: 20, right: 30, bottom: 40, left: 100 }; // Left margin for labels
        this.options = options;

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);

        this.init();
    }

    init() {
        this.svg = d3.select(this.container).append('svg')
            .style('width', '100%')
            .style('height', '100%');

        this.g = this.svg.append('g');

        this.xAxisG = this.g.append('g').attr('class', 'axis x-axis');
        this.yAxisG = this.g.append('g').attr('class', 'axis y-axis');

        this.tooltip = d3.select('body').append('div')
            .attr('class', 'chart-tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background', COLORS.tooltipBg)
            .style('border', `1px solid ${COLORS.tooltipBorder}`)
            .style('padding', '8px')
            .style('pointer-events', 'none');
    }

    update(data) {
        // Expects data: [{ name: 'Stuttgart', value: 1.78, rank: 1 }, ...]
        this.data = data.sort((a, b) => a.value - b.value); // Cheapest first
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

        // Scales
        const yScale = d3.scaleBand()
            .domain(this.data.map(d => d.name))
            .range([0, height])
            .padding(0.2);

        const xScale = d3.scaleLinear()
            .domain([
                d3.min(this.data, d => d.value) * 0.98,
                d3.max(this.data, d => d.value) * 1.01
            ])
            .range([0, width]);

        // Bars
        const bars = this.g.selectAll('.bar').data(this.data, d => d.name);

        bars.enter().append('rect')
            .attr('class', 'bar')
            .attr('y', d => yScale(d.name))
            .attr('height', yScale.bandwidth())
            .attr('x', 0)
            .attr('width', 0) // Animate from 0
            .merge(bars)
            .transition().duration(500)
            .attr('x', 0)
            .attr('y', d => yScale(d.name))
            .attr('width', d => xScale(d.value))
            .attr('height', yScale.bandwidth())
            .attr('fill', d => {
                // Color logic: Cheap = Green, Expensive = Red
                const min = d3.min(this.data, x => x.value);
                const max = d3.max(this.data, x => x.value);
                const ratio = (d.value - min) / ((max - min) || 1);
                return d3.interpolateRdYlGn(1 - ratio); // Inverted RdYlGn (Green low)
            });

        // Labels (Value text on bar)
        const labels = this.g.selectAll('.label').data(this.data, d => d.name);

        labels.enter().append('text')
            .attr('class', 'label')
            .merge(labels)
            .attr('y', d => yScale(d.name) + yScale.bandwidth() / 2)
            .attr('x', d => xScale(d.value) - 5)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .attr('fill', '#fff')
            .text(d => d.value.toFixed(3) + ' €')
            .style('font-size', '0.8rem')
            .style('font-weight', 'bold');

        bars.exit().remove();
        labels.exit().remove();

        // Axes
        this.xAxisG.attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).ticks(5));

        this.yAxisG.call(d3.axisLeft(yScale));

        // Style
        this.svg.selectAll('.domain').remove();
    }

    destroy() {
        this.resizeObserver.disconnect();
        this.svg.remove();
        this.tooltip.remove();
    }
}
