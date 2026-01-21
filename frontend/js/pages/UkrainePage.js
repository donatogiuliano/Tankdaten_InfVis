import { UkraineBubbleChart } from '../components/UkraineBubbleChart.js';
import { state } from '../state.js';

export class UkrainePage {
    constructor() {
        this.data = null;
        this.selectedFuel = state.get('fuelType') || 'diesel'; // Default override might need to be e10 but Keeping diesel if preferred, or using state default
        this.pinnedBubble = null;
        this.resizeObserver = null;
        this.chart = null;
    }

    async render(container) {
        this.container = container;
        // Sync state
        this.selectedFuel = state.get('fuelType') || 'diesel';

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
                    <div class="fuel-toggle-group" style="display:flex; background: #f0f2f5; padding: 3px; border-radius: 6px;">
                        <button class="fuel-btn ${this.selectedFuel === 'e5' ? 'active' : ''}" data-fuel="e5" style="border:none; padding: 4px 12px; border-radius: 4px; cursor:pointer; font-size:0.9rem; font-weight:500; transition:all 0.2s;">Super E5</button>
                        <button class="fuel-btn ${this.selectedFuel === 'e10' ? 'active' : ''}" data-fuel="e10" style="border:none; padding: 4px 12px; border-radius: 4px; cursor:pointer; font-size:0.9rem; font-weight:500; transition:all 0.2s;">E10</button>
                        <button class="fuel-btn ${this.selectedFuel === 'diesel' ? 'active' : ''}" data-fuel="diesel" style="border:none; padding: 4px 12px; border-radius: 4px; cursor:pointer; font-size:0.9rem; font-weight:500; transition:all 0.2s;">Diesel</button>
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
                    <!-- Tooltip managed by Component now, but we keep structure if needed by CSS -->
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
                .fuel-btn:hover { background-color: rgba(0,0,0,0.05); }
                .fuel-btn.active { background-color: #333; color: white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
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
                state.set('fuelType', this.selectedFuel);
                this.renderBubbles();
                this.updateStats();
            });
        });

        // Global State Subscription
        state.subscribe((s, key, value) => {
            if (key === 'fuelType') {
                // Update Buttons UI
                const btns = this.container.querySelectorAll('.fuel-btn');
                btns.forEach(b => {
                    if (b.dataset.fuel === value) b.classList.add('active');
                    else b.classList.remove('active');
                });

                // Update Internal State & Reload
                this.selectedFuel = value;
                this.renderBubbles();
                this.updateStats();
            }
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

        if (!this.chart) {
            this.chart = new UkraineBubbleChart(chartContainer, this.events);
        }

        this.chart.update(this.data, this.selectedFuel);
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
