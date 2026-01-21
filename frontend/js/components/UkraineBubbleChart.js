export class UkraineBubbleChart {
    constructor(container, events) {
        this.container = container;
        this.events = events || [];
        // Attempt to find tooltip within current scope or create it
        // Note: UkrainePage keeps tooltip outside of the chart div technically (#bubble-chart's sibling)
        // But for component purity, the chart should ideally manage its tooltip or look for it relative to its container.
        // We will assume the container passed IS #bubble-chart's container (the card)? No, Page passes #bubble-chart.
        // We will stick to creating/finding a tooltip associated with this instance.

        let tp = d3.select(this.container.parentNode).select('#bubble-tooltip');
        if (tp.empty()) {
            // Fallback: create one
            tp = d3.select(this.container.parentNode).append('div')
                .attr('id', 'bubble-tooltip')
                .style('position', 'absolute')
                .style('display', 'none')
                .style('background', 'rgba(0,0,0,0.9)')
                .style('color', 'white')
                .style('padding', '12px 16px')
                .style('border-radius', '10px')
                .style('font-size', '0.9rem')
                .style('pointer-events', 'none')
                .style('z-index', '100')
                .style('box-shadow', '0 4px 20px rgba(0,0,0,0.3)');
        }
        this.tooltip = tp; // d3 selection
        this.pinnedBubble = null;
    }

    update(data, selectedFuel) {
        if (!data) return;

        this.container.innerHTML = '';
        const fuelData = data.filter(d => d.fuel === selectedFuel);

        // Parse dates if needed
        const parseDate = d3.timeParse('%Y-%m-%d');
        fuelData.forEach(d => {
            if (!d.parsedDate) d.parsedDate = parseDate(d.date);
        });
        fuelData.sort((a, b) => a.parsedDate - b.parsedDate);

        const margin = { top: 40, right: 30, bottom: 50, left: 60 };
        const width = (this.container.clientWidth || 800) - margin.left - margin.right;
        const height = (this.container.clientHeight || 400) - margin.top - margin.bottom;

        const x = d3.scaleTime()
            .domain([new Date(2022, 0, 1), new Date(2022, 11, 31)])
            .range([0, width]);

        const minPrice = d3.min(fuelData, d => d.price_mean);
        const maxPrice = d3.max(fuelData, d => d.price_mean);
        const y = d3.scaleLinear()
            .domain([minPrice * 0.9, maxPrice * 1.1])
            .range([height, 0]);

        const radiusScale = d3.scaleLinear()
            .domain([minPrice, maxPrice])
            .range([12, 45]);

        const colorScale = d3.scaleLinear()
            .domain([1.70, 1.95, 2.20])
            .range(['#43a047', '#ffc107', '#e53935'])
            .interpolate(d3.interpolateRgb);

        const svg = d3.select(this.container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .on('click', () => {
                this.pinnedBubble = null;
                this.tooltip.style('display', 'none');
            })
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const bubbles = svg.selectAll('circle')
            .data(fuelData)
            .enter()
            .append('circle')
            .attr('class', 'bubble')
            .attr('cx', d => x(d.parsedDate))
            .attr('cy', d => y(d.price_mean))
            .attr('r', 0)
            .attr('fill', d => colorScale(d.price_mean))
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('opacity', 0.85);

        bubbles.transition()
            .duration(800)
            .delay((d, i) => i * 5)
            .attr('r', d => radiusScale(d.price_mean));

        bubbles.on('mouseenter', (event, d) => {
            if (this.pinnedBubble) return;
            d3.select(event.currentTarget).style('stroke', '#333');
            this.showTooltip(d, x, y, margin, colorScale);
        })
            .on('mouseleave', (event) => {
                d3.select(event.currentTarget).style('stroke', 'white');
                if (!this.pinnedBubble) {
                    this.tooltip.style('display', 'none');
                }
            })
            .on('click', (event, d) => {
                event.stopPropagation();
                if (this.pinnedBubble === d) {
                    this.pinnedBubble = null;
                    this.tooltip.style('display', 'none');
                } else {
                    this.pinnedBubble = d;
                    this.showTooltip(d, x, y, margin, colorScale);
                }
            });

        const parseEventDate = d3.timeParse('%Y-%m-%d');
        this.events.forEach(e => {
            const date = parseEventDate(e.date);
            const xPos = x(date);

            svg.append('line')
                .attr('x1', xPos)
                .attr('x2', xPos)
                .attr('y1', 0)
                .attr('y2', height)
                .attr('stroke', e.color)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5');

            svg.append('text')
                .attr('x', xPos)
                .attr('y', -10)
                .attr('text-anchor', 'middle')
                .attr('fill', e.color)
                .attr('font-size', '12px')
                .attr('font-weight', 'bold')
                .text(e.icon);

            svg.append('text')
                .attr('x', xPos)
                .attr('y', -25)
                .attr('text-anchor', 'middle')
                .attr('fill', e.color)
                .attr('font-size', '10px')
                .text(e.label);
        });

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(d3.timeMonth.every(3)).tickFormat(d3.timeFormat('%b')))
            .selectAll('text').style('font-size', '11px');

        svg.append('g')
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => d.toFixed(2) + '€'))
            .selectAll('text').style('font-size', '11px');
    }

    showTooltip(d, x, y, margin, colorScale) {
        const formatDate = d3.timeFormat('%d. %B %Y');
        // tooltip is d3 selection
        this.tooltip.html(`
            <div style="font-weight: 700; margin-bottom: 4px;">${formatDate(d.parsedDate)}</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: ${colorScale(d.price_mean)};">${d.price_mean.toFixed(3)} €</div>
            <div style="font-size: 0.8rem; opacity: 0.7; margin-top: 4px;">pro Liter ${this.pinnedBubble ? '(📌 fixiert)' : ''}</div>
        `);
        this.tooltip.style('display', 'block');
        this.tooltip.style('left', (x(d.parsedDate) + margin.left + 25) + 'px');
        this.tooltip.style('top', (y(d.price_mean) + margin.top - 30) + 'px');
    }
}
