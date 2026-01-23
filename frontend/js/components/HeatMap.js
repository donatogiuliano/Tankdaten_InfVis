export class Heatmap {
    constructor(container, data, options = {}) {
        this.container = container;
        this.allData = data; // Full dataset
        this.data = data; // Filtered dataset
        this.options = {
            margin: { top: 20, right: 30, bottom: 40, left: 40 },
            fuelType: 'e10',
            ...options
        };
        this.init();
    }

    init() {
        this.container.innerHTML = '';

        const rect = this.container.getBoundingClientRect();
        this.width = rect.width - this.options.margin.left - this.options.margin.right;
        this.height = rect.height - this.options.margin.top - this.options.margin.bottom;

        this.svg = d3.select(this.container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${rect.width} ${rect.height}`)
            .append("g")
            .attr("transform", `translate(${this.options.margin.left},${this.options.margin.top})`);

        // Scales
        // X = Month (Jan - Dec)
        this.x = d3.scaleBand()
            .range([0, this.width])
            .domain(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])
            .padding(0.05);

        // Y = Year
        this.y = d3.scaleBand()
            .range([this.height, 0])
            .padding(0.05);

        // Color
        this.color = d3.scaleSequential()
            .interpolator(this.options.colorMode === 'accessible'
                ? d3.interpolateViridis
                : d3.interpolateInferno);

        // Axes
        this.svg.append("g")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(this.x));

        this.yAxis = this.svg.append("g");
    }

    update(filteredDataRange = null, colorMode = 'default') {
        this.options.colorMode = colorMode;
        this.color.interpolator(colorMode === 'accessible' ? d3.interpolateViridis : d3.interpolateInferno);
        // Prepare Data
        // 1. Filter by Date Range (if brushed)
        let workingData = this.allData;
        if (filteredDataRange) {
            const [start, end] = filteredDataRange;
            workingData = workingData.filter(d => {
                const date = new Date(d.date);
                return date >= start && date <= end;
            });
        }

        const fuel = this.options.fuelType;

        // 2. Aggregate per Month/Year
        // We need average price for each (Year, Month) pair
        const nested = d3.rollups(workingData,
            v => d3.mean(v, d => +d[fuel]),
            d => new Date(d.date).getFullYear(),
            d => new Date(d.date).getMonth() // 0-11
        );

        // Flatten back to list
        const flatData = [];
        const years = new Set();
        nested.forEach(([year, months]) => {
            years.add(year);
            months.forEach(([monthIdx, val]) => {
                flatData.push({ year, monthIdx, val });
            });
        });

        const sortedYears = Array.from(years).sort();
        this.y.domain(sortedYears);
        this.yAxis.transition().call(d3.axisLeft(this.y));

        // Update Color domain
        const [min, max] = d3.extent(flatData, d => d.val);
        this.color.domain([min, max]);

        // Draw Rects
        const monthsStr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const rects = this.svg.selectAll("rect")
            .data(flatData, d => `${d.year}-${d.monthIdx}`);

        rects.enter().append("rect")
            .attr("x", d => this.x(monthsStr[d.monthIdx]))
            .attr("y", d => this.y(d.year))
            .attr("width", this.x.bandwidth())
            .attr("height", this.y.bandwidth())
            .style("fill", d => this.color(d.val))
            .merge(rects)
            .transition()
            .attr("x", d => this.x(monthsStr[d.monthIdx]))
            .attr("y", d => this.y(d.year))
            .attr("width", this.x.bandwidth())
            .attr("height", this.y.bandwidth())
            .style("fill", d => this.color(d.val));

        rects.exit().remove();
    }
}
