
export class UkrainePage {
    constructor() {
        this.data = null;
        this.selectedFuel = 'diesel';
        this.pinnedBubble = null;
        this.resizeObserver = null;
    }

    async render(container) {
        this.container = container;
        this.events = [
            { date: '2022-02-24', label: 'Kriegsausbruch', color: '#d32f2f', icon: '⚔️' },
            { date: '2022-03-10', label: 'Rekordpreis', color: '#7b1fa2', icon: '📈' },
            { date: '2022-06-01', label: 'Tankrabatt', color: '#388e3c', icon: '💰' },
            { date: '2022-08-31', label: 'Rabatt Ende', color: '#f57c00', icon: '🔚' }
        ];

        container.innerHTML = `
            <div class="ukraine-page" style="padding: 1.5rem; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; overflow-y: auto;">
                
                <!-- Header (Light Theme) -->
                <div style="margin-bottom: 1rem;">
                    <h1 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.8rem;">⚔️</span> Ukraine-Schock 2022
                    </h1>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;">
                        Bubble-Visualisierung: Jede Blase = ein Tag, Größe = Preis
                    </p>
                </div>

                <!-- Controls + Legend with Prices -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <div style="display: flex; gap: 0.5rem; background: #f0f2f5; padding: 4px; border-radius: 8px;">
                        <button class="fuel-btn active" data-fuel="diesel" style="border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;">Diesel</button>
                        <button class="fuel-btn" data-fuel="e10" style="border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;">E10</button>
                        <button class="fuel-btn" data-fuel="e5" style="border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s;">Super E5</button>
                    </div>
                    
                    <!-- Legend with price ranges -->
                    <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.85rem; color: #5f6368;">
                        <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 12px; height: 12px; background: #43a047; border-radius: 50%;"></span> Günstig (&lt;1.80€)</span>
                        <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 12px; height: 12px; background: #ffc107; border-radius: 50%;"></span> Mittel (1.80-2.10€)</span>
                        <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 12px; height: 12px; background: #e53935; border-radius: 50%;"></span> Teuer (&gt;2.10€)</span>
                    </div>
                </div>

                <!-- Stats Row (Light Theme) -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem;">
                    <div style="background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-align: center;">
                        <div style="font-size: 0.75rem; color: #888; text-transform: uppercase;">Rekordpreis</div>
                        <div id="peak-price" style="font-size: 1.5rem; font-weight: 700; color: #e53935;">---</div>
                    </div>
                    <div style="background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-align: center;">
                        <div style="font-size: 0.75rem; color: #888; text-transform: uppercase;">Tankfüllung (50L)</div>
                        <div id="tank-cost" style="font-size: 1.5rem; font-weight: 700; color: #ff9800;">---</div>
                    </div>
                    <div style="background: white; border-radius: 8px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-align: center;">
                        <div style="font-size: 0.75rem; color: #888; text-transform: uppercase;">Preisanstieg</div>
                        <div id="price-rise" style="font-size: 1.5rem; font-weight: 700; color: #9c27b0;">---</div>
                    </div>
                </div>

                <!-- Bubble Chart -->
                <div class="chart-card" style="flex: 1; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 1.5rem; min-height: 350px; position: relative;">
                    <div id="bubble-chart" style="width: 100%; height: 100%; position: relative;"></div>
                    
                    <!-- Tooltip -->
                    <div id="bubble-tooltip" style="position: absolute; display: none; background: rgba(0,0,0,0.9); color: white; padding: 12px 16px; border-radius: 10px; font-size: 0.9rem; pointer-events: none; z-index: 100; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    </div>
                </div>

                <!-- Compact Event Timeline -->
                <div style="display: flex; justify-content: center; gap: 2rem; margin-top: 1rem; padding: 0.75rem 1rem; background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                    ${this.events.map(e => `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 24px; height: 24px; background: ${e.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">${e.icon}</span>
                            <span style="font-size: 0.8rem; font-weight: 500; color: #333;">${e.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <style>
                .fuel-btn:hover { background: rgba(0,0,0,0.05); }
                .fuel-btn.active { background: #333; color: white; }
                .bubble { cursor: pointer; transition: transform 0.2s, filter 0.2s; }
                .bubble:hover { transform: scale(1.3); filter: brightness(1.2); }
            </style>
        `;

        this.initEvents();
        await this.loadData();
    }

    initEvents() {
        const fuelBtns = this.container.querySelectorAll('.fuel-btn');
        fuelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                fuelBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedFuel = btn.dataset.fuel;
                this.renderBubbles();
                this.updateStats();
            });
        });
    }

    async loadData() {
        try {
            const response = await fetch('/api/data/ukraine');
            if (!response.ok) throw new Error('Daten nicht gefunden');
            this.data = await response.json();
            
            requestAnimationFrame(() => {
                setTimeout(() => {
                    this.renderBubbles();
                    this.updateStats();
                    
                    if (!this.resizeObserver) {
                        this.resizeObserver = new ResizeObserver(() => {
                            if (this.data) {
                                this.renderBubbles();
                            }
                        });
                        const chartContainer = this.container.querySelector('#bubble-chart');
                        if (chartContainer) {
                            this.resizeObserver.observe(chartContainer);
                        }
                    }
                }, 200);
            });
        } catch (e) {
            console.error(e);
            this.container.querySelector('#bubble-chart').innerHTML = `
                <div style="text-align: center; color: #c62828; padding: 2rem;">⚠️ Fehler: ${e.message}</div>
            `;
        }
    }

    renderBubbles() {
        if (!this.data) return;

        const chartContainer = this.container.querySelector('#bubble-chart');
        chartContainer.innerHTML = '';
        const tooltip = this.container.querySelector('#bubble-tooltip');

        const fuelData = this.data.filter(d => d.fuel === this.selectedFuel);
        const parseDate = d3.timeParse('%Y-%m-%d');
        fuelData.forEach(d => d.parsedDate = parseDate(d.date));
        fuelData.sort((a, b) => a.parsedDate - b.parsedDate);

        const margin = { top: 40, right: 30, bottom: 50, left: 60 };
        const width = (chartContainer.clientWidth || 800) - margin.left - margin.right;
        const height = (chartContainer.clientHeight || 400) - margin.top - margin.bottom;

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

        const svg = d3.select(chartContainer)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .on('click', () => {
                this.pinnedBubble = null;
                tooltip.style.display = 'none';
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
            this.showTooltip(d, tooltip, x, y, margin, colorScale);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('stroke', 'white');
            if (!this.pinnedBubble) {
                tooltip.style.display = 'none';
            }
        })
        .on('click', (event, d) => {
            event.stopPropagation();
            if (this.pinnedBubble === d) {
                this.pinnedBubble = null;
                tooltip.style.display = 'none';
            } else {
                this.pinnedBubble = d;
                this.showTooltip(d, tooltip, x, y, margin, colorScale);
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

    showTooltip(d, tooltip, x, y, margin, colorScale) {
        const formatDate = d3.timeFormat('%d. %B %Y');
        tooltip.innerHTML = `
            <div style="font-weight: 700; margin-bottom: 4px;">${formatDate(d.parsedDate)}</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: ${colorScale(d.price_mean)};">${d.price_mean.toFixed(3)} €</div>
            <div style="font-size: 0.8rem; opacity: 0.7; margin-top: 4px;">pro Liter ${this.pinnedBubble ? '(📌 fixiert)' : ''}</div>
        `;
        tooltip.style.display = 'block';
        tooltip.style.left = (x(d.parsedDate) + margin.left + 25) + 'px';
        tooltip.style.top = (y(d.price_mean) + margin.top - 30) + 'px';
    }

    updateStats() {
        if (!this.data) return;
        
        const fuelData = this.data.filter(d => d.fuel === this.selectedFuel);
        const prices = fuelData.map(d => d.price_mean);
        const max = Math.max(...prices);
        const min = Math.min(...prices);
        const diff = max - min;
        const tankDiff = diff * 50;
        const pctRise = ((max - min) / min * 100);

        this.animateNumber('peak-price', max, '€', 3);
        this.animateNumber('tank-cost', tankDiff, '€', 2, '+');
        this.animateNumber('price-rise', pctRise, '%', 1, '+');
    }

    animateNumber(id, target, suffix, decimals, prefix = '') {
        const el = this.container.querySelector(`#${id}`);
        if (!el) return;
        
        const start = parseFloat(el.innerText.replace(/[^0-9.-]/g, '')) || 0;
        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            
            const current = start + (target - start) * ease;
            el.innerHTML = `${prefix}${current.toFixed(decimals)}${suffix}`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }
}
