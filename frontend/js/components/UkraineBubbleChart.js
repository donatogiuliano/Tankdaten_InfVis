export class UkraineBubbleChart {
    constructor(container, events) {
        this.container = container;
        this.events = events || [];

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

    update(data, selectedFuel, colorMode = 'default') {
        if (!data) return;
        this.colorMode = colorMode;

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

        // --- 1. Setup/Select SVG ---
        let svg = d3.select(this.container).select('svg.chart-svg');
        let g;

        if (svg.empty()) {
            this.container.innerHTML = '';
            svg = d3.select(this.container)
                .append('svg')
                .attr('class', 'chart-svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .on('click', () => {
                    this.pinnedBubble = null;
                    this.tooltip.style('display', 'none');
                });

            g = svg.append('g')
                .attr('class', 'chart-area')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Add Axis Groups once
            g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${height})`);
            g.append('g').attr('class', 'y-axis');
        } else {
            // Update dims
            svg.attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom);
            g = svg.select('.chart-area');
        }

        // --- 2. Scales ---
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
            .domain([minPrice, (minPrice + maxPrice) / 2, maxPrice]) // Dynamic domain
            .range(colorMode === 'accessible'
                ? ['#0072B2', '#E69F00', '#B24A7A']
                : ['#2c752fff', '#ecb100ff', '#b13230ff'])
            .interpolate(d3.interpolateRgb);

        // --- 3. Axes ---
        g.select('.x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat('%b')))
            .selectAll('text').style('font-size', '11px');

        g.select('.y-axis')
            .transition().duration(500)
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => d.toFixed(2) + '€'))
            .selectAll('text').style('font-size', '11px');

        // --- 4. Bubbles (Join) ---
        const bubbles = g.selectAll('circle.bubble')
            .data(fuelData, d => d.date);

        // EXIT
        bubbles.exit()
            .transition().duration(500)
            .attr('r', 0)
            .remove();

        // MERGE (Update existing + Enter)
        const bubblesEnter = bubbles.enter()
            .append('circle')
            .attr('class', 'bubble')
            .attr('cx', d => x(d.parsedDate))
            .attr('cy', d => y(d.price_mean))
            .attr('r', 0) // Start small
            .attr('fill', d => colorScale(d.price_mean))
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .style('opacity', 0.85);

        // Add Listeners to Enter only
        bubblesEnter
            .on('mouseenter', (event, d) => {
                if (this.pinnedBubble) return;
                d3.select(event.currentTarget).style('stroke', '#000')
                    .style('stroke-width', 3);
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

        // Update All (Transitions)
        bubblesEnter.merge(bubbles)
            .transition()
            .duration(800)
            .attr('cx', d => x(d.parsedDate))
            .attr('cy', d => y(d.price_mean))
            .attr('fill', d => colorScale(d.price_mean))
            .attr('r', d => radiusScale(d.price_mean));


        // --- 5. Events Lines & Labels ---
        g.selectAll('.event-marker').remove();

        const parseEventDate = d3.timeParse('%Y-%m-%d');
        this.events.forEach((e, i) => {
            const date = parseEventDate(e.date);
            const xPos = x(date);

            const dAtDate = fuelData.find(d => d.date === e.date);
            let y2Pos = height;
            if (dAtDate) {
                y2Pos = y(dAtDate.price_mean) - radiusScale(dAtDate.price_mean);
            }

            const yOffset = (i % 2 === 0) ? -10 : -25;

            const eventG = g.append('g').attr('class', 'event-marker');

            eventG.append('line')
                .attr('x1', xPos)
                .attr('x2', xPos)
                .attr('y1', yOffset + 3)
                .attr('y2', y2Pos)
                .attr('stroke', e.color)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5');

            eventG.append('text')
                .attr('x', xPos)
                .attr('y', yOffset)
                .attr('text-anchor', 'middle')
                .attr('fill', e.color)
                .attr('font-size', '12px')
                .attr('font-weight', '700')
                .text(e.label);
        });
    }

    showTooltip(d, x, y, margin, colorScale) {
        const formatDate = d3.timeFormat('%d. %B %Y');
        this.tooltip.html(`
            <div style="font-weight: 700; margin-bottom: 4px;">${formatDate(d.parsedDate)}</div>
<div style="
  font-size: 1.3rem;
  font-weight: 800;
  color: ${colorScale(d.price_mean)};
  text-shadow: 0 0 2px #000;
">
            <div style="font-size: 0.8rem; opacity: 0.7; margin-top: 4px;">pro Liter ${this.pinnedBubble ? '(📌 fixiert)' : ''}</div>
        `);
        this.tooltip.style('display', 'block');
        this.tooltip.style('left', (x(d.parsedDate) + margin.left + 25) + 'px');
        this.tooltip.style('top', (y(d.price_mean) + margin.top - 30) + 'px');
    }
}
