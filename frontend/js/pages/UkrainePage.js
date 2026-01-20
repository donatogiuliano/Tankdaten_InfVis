
export class UkrainePage {
    constructor() {
        this.data = null;
    }

    async render(container) {
        this.container = container;
        
        this.events = [
            { date: '2022-02-24', label: '💥 Invasion', color: '#ff0055' },
            { date: '2022-03-08', label: '📈 ATH', color: '#ff00ff' },
            { date: '2022-06-01', label: '⛽ Rabatt', color: '#00ff88' },
            { date: '2022-09-01', label: '🔚 Ende', color: '#ff8800' }
        ];

        container.innerHTML = `
            <div class="ukraine-stream">
                <!-- Neon Header -->
                <div class="neon-header">
                    <div class="scan-line"></div>
                    <div class="header-left">
                        <span class="flag-icon">🇺🇦</span>
                        <div class="title-block">
                            <h1>UKRAINE CRISIS</h1>
                            <span>Fuel Price Shockwave 2022</span>
                        </div>
                    </div>
                    <div class="stat-chips">
                        <div class="chip peak"><span id="max-val">---</span><small>Peak</small></div>
                        <div class="chip rise"><span id="rise-val">---</span><small>Rise</small></div>
                        <div class="chip drop"><span id="drop-val">---</span><small>Rabatt</small></div>
                    </div>
                </div>

                <!-- Stream Visualization -->
                <div class="stream-container">
                    <div id="stream-chart"></div>
                </div>

                <!-- Event Chips -->
                <div class="events-row">
                    ${this.events.map(e => `<div class="event-tag" style="--clr:${e.color}">${e.label}</div>`).join('')}
                </div>

                <!-- Legend -->
                <div class="legend-row">
                    <div class="leg-item"><span class="dot diesel"></span>Diesel</div>
                    <div class="leg-item"><span class="dot e10"></span>Super E10</div>
                    <div class="leg-item"><span class="dot e5"></span>Super E5</div>
                </div>
            </div>

            <style>
                @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');

                .ukraine-stream {
                    min-height: 100vh;
                    background: linear-gradient(180deg, #08081a 0%, #0d0d20 100%);
                    padding: 1.5rem;
                    color: white;
                }

                .neon-header {
                    position: relative;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(20,20,40,0.9);
                    border: 1px solid rgba(255,0,136,0.3);
                    border-radius: 16px;
                    padding: 1.25rem 1.75rem;
                    margin-bottom: 1.5rem;
                    overflow: hidden;
                }

                .scan-line {
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #ff0088, #00ffff, transparent);
                    animation: scan 2.5s linear infinite;
                }
                @keyframes scan { from{transform:translateX(-100%)} to{transform:translateX(100%)} }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .flag-icon {
                    font-size: 3rem;
                    filter: drop-shadow(0 0 15px rgba(0,100,255,0.8));
                    animation: glow 2s ease-in-out infinite alternate;
                }
                @keyframes glow { from{filter:drop-shadow(0 0 15px rgba(0,100,255,0.6))} to{filter:drop-shadow(0 0 25px rgba(255,0,255,0.8))} }

                .title-block h1 {
                    margin: 0;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 1.75rem;
                    letter-spacing: 3px;
                    background: linear-gradient(90deg, #fff, #00ffff, #ff00ff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .title-block span {
                    font-size: 0.8rem;
                    color: rgba(255,255,255,0.4);
                    letter-spacing: 1px;
                }

                .stat-chips {
                    display: flex;
                    gap: 1rem;
                }
                .chip {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    border-radius: 10px;
                    min-width: 80px;
                }
                .chip span { font-family: 'Orbitron', monospace; font-size: 1.1rem; font-weight: 700; }
                .chip small { font-size: 0.7rem; opacity: 0.6; text-transform: uppercase; margin-top: 2px; }
                .chip.peak { background: rgba(255,0,85,0.15); border: 1px solid rgba(255,0,85,0.4); color: #ff0055; }
                .chip.rise { background: rgba(255,0,255,0.15); border: 1px solid rgba(255,0,255,0.4); color: #ff00ff; }
                .chip.drop { background: rgba(0,255,136,0.15); border: 1px solid rgba(0,255,136,0.4); color: #00ff88; }

                .stream-container {
                    background: rgba(15,15,30,0.95);
                    border: 1px solid rgba(100,100,150,0.2);
                    border-radius: 16px;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                }

                #stream-chart {
                    width: 100%;
                    height: 380px;
                }

                .events-row {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                .event-tag {
                    padding: 0.5rem 1rem;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--clr);
                    border-radius: 20px;
                    color: var(--clr);
                    font-size: 0.85rem;
                    font-weight: 600;
                    box-shadow: 0 0 12px color-mix(in srgb, var(--clr) 40%, transparent);
                }

                .legend-row {
                    display: flex;
                    justify-content: center;
                    gap: 2rem;
                }
                .leg-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: rgba(255,255,255,0.7);
                    font-size: 0.9rem;
                }
                .dot {
                    width: 20px;
                    height: 6px;
                    border-radius: 3px;
                }
                .dot.diesel { background: #ff0055; box-shadow: 0 0 10px #ff0055; }
                .dot.e10 { background: #00ccff; box-shadow: 0 0 10px #00ccff; }
                .dot.e5 { background: #aa00ff; box-shadow: 0 0 10px #aa00ff; }
            </style>
        `;

        await this.loadData();
    }

    async loadData() {
        try {
            const res = await fetch('/api/data/ukraine');
            this.data = await res.json();
            console.log('Ukraine data loaded:', this.data.length, 'records');
            this.renderStreamgraph();
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }

    renderStreamgraph() {
        if (!this.data || this.data.length === 0) {
            console.error('No data available');
            return;
        }

        const container = this.container.querySelector('#stream-chart');
        container.innerHTML = '';
        
        // Get actual container width - use parent if needed
        const containerWidth = container.clientWidth || container.parentElement.clientWidth || 1000;

        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const width = containerWidth - margin.left - margin.right;
        const height = 380 - margin.top - margin.bottom;

        const svg = d3.select(container).append('svg')
            .attr('width', '100%')
            .attr('height', height + margin.top + margin.bottom)
            .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        const defs = svg.append('defs');

        // Glow filter
        const glow = defs.append('filter').attr('id', 'stream-glow')
            .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
        glow.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
        glow.append('feMerge').selectAll('feMergeNode')
            .data(['blur', 'SourceGraphic']).enter()
            .append('feMergeNode').attr('in', d => d);

        // Gradients
        const makeGradient = (id, c1, c2) => {
            const g = defs.append('linearGradient').attr('id', id)
                .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
            g.append('stop').attr('offset', '0%').attr('stop-color', c1).attr('stop-opacity', 0.9);
            g.append('stop').attr('offset', '100%').attr('stop-color', c2).attr('stop-opacity', 0.2);
        };
        makeGradient('grad-diesel', '#ff0055', '#ff3388');
        makeGradient('grad-e10', '#00aaff', '#00ffff');
        makeGradient('grad-e5', '#9900ff', '#ff00ff');

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // Process data
        const fuels = ['diesel', 'e10', 'e5'];
        const byDate = d3.group(this.data, d => d.date);
        
        const processed = Array.from(byDate, ([date, recs]) => {
            const row = { date: new Date(date) };
            recs.forEach(r => {
                if (fuels.includes(r.fuel)) row[r.fuel] = r.price_mean;
            });
            return row;
        })
        .filter(d => d.diesel && d.e10 && d.e5)
        .sort((a, b) => a.date - b.date);

        console.log('Processed data:', processed.length, 'points');
        if (processed.length === 0) return;

        // Scales
        const x = d3.scaleTime()
            .domain(d3.extent(processed, d => d.date))
            .range([0, width]);

        // Stack with wiggle offset for stream effect
        const stack = d3.stack()
            .keys(fuels)
            .offset(d3.stackOffsetWiggle)
            .order(d3.stackOrderInsideOut);

        const series = stack(processed);

        const y = d3.scaleLinear()
            .domain([
                d3.min(series, s => d3.min(s, d => d[0])),
                d3.max(series, s => d3.max(s, d => d[1]))
            ])
            .range([height, 0]);

        // Area generator
        const area = d3.area()
            .x(d => x(d.data.date))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]))
            .curve(d3.curveBasis);

        // Draw streams
        fuels.forEach((fuel, i) => {
            // Glow layer
            g.append('path')
                .datum(series[i])
                .attr('fill', `url(#grad-${fuel})`)
                .attr('filter', 'url(#stream-glow)')
                .attr('opacity', 0.5)
                .attr('d', area);

            // Main layer
            g.append('path')
                .datum(series[i])
                .attr('fill', `url(#grad-${fuel})`)
                .attr('opacity', 0.85)
                .attr('d', area)
                .style('transition', 'opacity 0.3s')
                .on('mouseover', function() { d3.select(this).attr('opacity', 1); })
                .on('mouseout', function() { d3.select(this).attr('opacity', 0.85); });
        });

        // Event lines
        this.events.forEach(ev => {
            const date = new Date(ev.date);
            const xPos = x(date);
            g.append('line')
                .attr('x1', xPos).attr('x2', xPos)
                .attr('y1', 0).attr('y2', height)
                .attr('stroke', ev.color)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '6,4')
                .attr('opacity', 0.7);
        });

        // X axis
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b')))
            .selectAll('text')
            .attr('fill', 'rgba(255,255,255,0.5)')
            .attr('font-size', '11px');

        g.selectAll('.domain, .tick line').attr('stroke', 'rgba(255,255,255,0.1)');

        // Update stats
        const allP = processed.flatMap(d => [d.diesel, d.e10, d.e5]);
        const maxP = d3.max(allP);
        const minP = d3.min(allP);
        const rise = ((maxP - minP) / minP * 100).toFixed(0);

        const marchP = processed.filter(d => d.date.getMonth() === 2).flatMap(d => [d.diesel, d.e10, d.e5]);
        const rabattP = processed.filter(d => d.date.getMonth() >= 5 && d.date.getMonth() <= 7).flatMap(d => [d.diesel, d.e10, d.e5]);
        const avgM = d3.mean(marchP) || maxP;
        const avgR = d3.mean(rabattP) || minP;
        const drop = ((avgM - avgR) * 100).toFixed(0);

        this.container.querySelector('#max-val').innerText = maxP.toFixed(2) + '€';
        this.container.querySelector('#rise-val').innerText = '+' + rise + '%';
        this.container.querySelector('#drop-val').innerText = '-' + drop + 'ct';
    }
}
