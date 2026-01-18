export class LineChart {
    constructor(container, data, options = {}) {
        this.container = container;
        this.originalData = data; // Keep full copy
        this.data = data;
        this.options = {
            margin: { top: 20, right: 30, bottom: 30, left: 40 },
            fuelType: 'e10', // specific fuel or 'all'
            onBrush: null,
            ...options
        };
        this.init();
    }

    init() {
        this.container.innerHTML = ''; // Clear

        // Dimensions
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width - this.options.margin.left - this.options.margin.right;
        this.height = rect.height - this.options.margin.top - this.options.margin.bottom;

        // SVG
        this.svg = d3.select(this.container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${rect.width} ${rect.height}`)
            .append("g")
            .attr("transform", `translate(${this.options.margin.left},${this.options.margin.top})`);

        // Scales
        this.x = d3.scaleTime().range([0, this.width]);
        this.y = d3.scaleLinear().range([this.height, 0]);

        // Axes Groups
        this.xAxis = this.svg.append("g").attr("transform", `translate(0,${this.height})`);
        this.yAxis = this.svg.append("g");

        // Path
        this.path = this.svg.append("path")
            .attr("fill", "none")
            .attr("stroke", "#1a73e8")
            .attr("stroke-width", 2);

        // Brush
        this.brush = d3.brushX()
            .extent([[0, 0], [this.width, this.height]])
            .on("end", (event) => this.brushed(event));

        this.brushGroup = this.svg.append("g")
            .attr("class", "brush")
            .call(this.brush);

        this.update(this.data);
    }

    update(newData) {
        this.data = newData;
        const fuel = this.options.fuelType;

        // Parse Data if needed (assume backend returns nice JSON)
        // Ensure Date objects
        this.data.forEach(d => {
            if (typeof d.date === 'string') d.date = new Date(d.date);
            d.value = +d[fuel]; // Dynamic based on fuel type
        });

        // Domains
        this.x.domain(d3.extent(this.data, d => d.date));
        this.y.domain([
            d3.min(this.data, d => d.value) * 0.95,
            d3.max(this.data, d => d.value) * 1.05
        ]);

        // Draw Axes (Transition)
        this.xAxis.transition().call(d3.axisBottom(this.x));
        this.yAxis.transition().call(d3.axisLeft(this.y));

        // Draw Line
        const line = d3.line()
            .x(d => this.x(d.date))
            .y(d => this.y(d.value));

        this.path.datum(this.data)
            .transition()
            .attr("d", line)
            .attr("stroke", this.getFuelColor(fuel));
    }

    brushed(event) {
        if (!event.selection) {
            // If cleared, reset?
            if (this.options.onBrush) this.options.onBrush(null);
            return;
        }
        const [x0, x1] = event.selection.map(this.x.invert);
        // Notify parent
        if (this.options.onBrush) this.options.onBrush([x0, x1]);
    }

    getFuelColor(type) {
        const colors = {
            'e5': '#1a73e8',   // Blue
            'e10': '#1e8e3e',  // Green
            'diesel': '#f9ab00' // Orange/Yellow
        };
        return colors[type] || '#1a73e8';
    }
}
