import { UkraineBubbleChart } from '../components/UkraineBubbleChart.js';
import { state } from '../state.js';

export class UkrainePage {
    constructor() {
        this.data = null;
        this.selectedFuel = state.get('fuelType') || 'diesel';
        this.pinnedBubble = null;
        this.resizeObserver = null;
        this.chart = null;
        this.boundHandleA11yToggle = this.handleA11yToggle.bind(this);
    }

    async render(container) {
        this.container = container;
        this.selectedFuel = state.get('fuelType') || 'diesel';

        this.events = [
            { date: '2022-02-24', label: 'Kriegsausbruch', color: '#2c3e50', icon: '⚔️' },
            { date: '2022-03-10', label: 'Rekordpreis', color: '#2c3e50', icon: '📈' },
            { date: '2022-06-01', label: 'Tankrabatt', color: '#2c3e50', icon: '💰' },
            { date: '2022-08-31', label: 'Rabatt Ende', color: '#2c3e50', icon: '🔚' }
        ];

        container.innerHTML = `
            <div class="page-layout">
                <!-- Header -->
                <div class="page-header">
                    <h1 class="page-title">
                        <span>⚔️</span> Ukraine-Schock 2022
                    </h1>
                </div>

                <!-- Controls & Legend -->
                <div class="controls-row">
                    <div class="button-group fuel-toggle-group">
                        <button class="btn-group-item ${this.selectedFuel === 'e5' ? 'active' : ''}" data-fuel="e5">Super E5</button>
                        <button class="btn-group-item ${this.selectedFuel === 'e10' ? 'active' : ''}" data-fuel="e10">E10</button>
                        <button class="btn-group-item ${this.selectedFuel === 'diesel' ? 'active' : ''}" data-fuel="diesel">Diesel</button>
                    </div>
                    
                    <div id="ukraine-legend" class="legend-container">
                        <span class="legend-item"><span class="legend-dot" style="background: #304FFE;"></span> Günstig (&lt;1.80€)</span>
                        <span class="legend-item"><span class="legend-dot" style="background: #FDD835;"></span> Mittel (1.80-2.10€)</span>
                        <span class="legend-item"><span class="legend-dot" style="background: #D50000;"></span> Teuer (&gt;2.10€)</span>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-label">Rekordpreis</div>
                        <div id="peak-price" class="stat-value" style="color: var(--danger);">---</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Tankfüllung (50L)</div>
                        <div id="tank-cost" class="stat-value" style="color: var(--warning);">---</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">Preisanstieg</div>
                        <div id="price-rise" class="stat-value" style="color: #9c27b0;">---</div>
                    </div>
                </div>

                <!-- Bubble Chart -->
                <div class="card chart-card">
                    <div id="bubble-chart" style="width: 100%; height: 100%; position: relative;"></div>
                </div>

                <!-- Compact Event Timeline -->
                <div style="display: flex; justify-content: center; gap: 2rem; margin-top: 1.5rem; padding: 0.75rem 1rem; background: var(--bg-card); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); border: 1px solid var(--border-subtle);">
                    ${this.events.map(e => `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 8px; height: 8px; background: ${e.color}; border-radius: 50%;"></span>
                            <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);">${e.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.initEvents();
        await this.loadData();
    }

    initEvents() {
        const fuelBtns = this.container.querySelectorAll('.btn-group-item');
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

        // --- A11y Toggle Logic ---
        const globalA11yBtn = document.getElementById('accessibility-toggle');
        if (globalA11yBtn) {
            globalA11yBtn.removeEventListener('click', this.boundHandleA11yToggle);
            globalA11yBtn.addEventListener('click', this.boundHandleA11yToggle);
        } else {
            // Retry once if not found (rare race condition)
            setTimeout(() => {
                const btn = document.getElementById('accessibility-toggle');
                if (btn) {
                    btn.removeEventListener('click', this.boundHandleA11yToggle);
                    btn.addEventListener('click', this.boundHandleA11yToggle);
                }
            }, 100);
        }

        // Global State Subscription
        state.subscribe((s, key, value) => {
            if (key === 'fuelType') {
                const btns = this.container.querySelectorAll('.btn-group-item');
                btns.forEach(b => {
                    if (b.dataset.fuel === value) b.classList.add('active');
                    else b.classList.remove('active');
                });

                this.selectedFuel = value;
                this.renderBubbles();
                this.updateStats();
            } else if (key === 'colorMode') {
                this.updateA11yUI();
                this.renderBubbles();
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
                <div style="text-align: center; color: var(--danger); padding: 2rem;">⚠️ Fehler: ${e.message}</div>
            `;
        }
    }

    handleA11yToggle() {
        if (!this.container || this.container.style.display === 'none') return;

        const current = state.get('colorMode');
        const next = current === 'accessible' ? 'default' : 'accessible';
        state.set('colorMode', next);

        this.updateA11yUI();
        this.renderBubbles();

        // Sync button class manually just in case
        const btn = document.getElementById('accessibility-toggle');
        if (btn) btn.classList.toggle('active', next === 'accessible');
    }

    updateA11yUI() {
        if (!this.container) return;
        const isAccessible = state.get('colorMode') === 'accessible';
        const a11yBtn = document.getElementById('accessibility-toggle'); // Global Button

        if (a11yBtn) {
            // Logic handled by event listener, visual sync might be needed?
            const stateIcon = a11yBtn.querySelector('.state-icon');
            // Check if icons exist (original code didn't use stateIcon much, but toggle class)
            a11yBtn.classList.toggle('active', isAccessible);
        }

        const legendColors = this.container.querySelectorAll('.legend-dot');
        if (legendColors.length === 3) {
            // Vibrant Diverging 3.0: Blue -> Yellow -> Red (Softer)
            const colors = isAccessible
                ? ['#0072B2', '#E69F00', '#B24A7A']
                : ['#43a047', '#ffc107', '#e53935'];

            legendColors.forEach((el, i) => {
                el.style.background = colors[i];
            });
        }
    }

    renderBubbles() {
        if (!this.data) return;
        const chartContainer = this.container.querySelector('#bubble-chart');
        if (!this.chart) {
            this.chart = new UkraineBubbleChart(chartContainer, this.events);
        }
        this.chart.update(this.data, this.selectedFuel, state.get('colorMode'));
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

        const globalA11yBtn = document.getElementById('accessibility-toggle');
        if (globalA11yBtn) {
            globalA11yBtn.removeEventListener('click', this.boundHandleA11yToggle);
        }
    }
}
