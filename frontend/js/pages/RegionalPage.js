import { RegionalMap } from '../components/RegionalMap.js';
import { state } from '../state.js';

export class RegionalPage {
    constructor() {
        this.map = null;
        this.data = null;
        this.geoJsonParams = null;
        this.selectedFuel = state.get('fuelType') || 'e10';
        this.boundHandleA11yToggle = this.handleA11yToggle.bind(this);
    }

    async render(container) {
        this.container = container;
        this.selectedFuel = state.get('fuelType') || 'e10';
        this.unsub = null;

        // Load State
        const savedYear = state.get('year') || new Date().getFullYear().toString();
        const savedMonth = parseInt(state.get('month') || '1');
        const savedFuel = state.get('fuelType') || 'e10';
        const currentYear = new Date().getFullYear();

        // Month Names
        const monthNames = ["", "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

        this.container.innerHTML = `
            <div class="page-layout">
                
                <!-- Header -->
                <div class="page-header">
                    <h1 class="page-title">
                        <span>🇩🇪</span> Regional-Vergleich
                    </h1>

                </div>

                <!-- Controls -->
                <div class="controls-row">
                    
                    <!-- Fuel Selector -->
                    <div class="button-group fuel-toggle-group">
                        <button class="btn-group-item ${savedFuel === 'e5' ? 'active' : ''}" data-value="e5">Super E5</button>
                        <button class="btn-group-item ${savedFuel === 'e10' ? 'active' : ''}" data-value="e10">E10</button>
                        <button class="btn-group-item ${savedFuel === 'diesel' ? 'active' : ''}" data-value="diesel">Diesel</button>
                    </div>

                    <!-- Date Controls -->
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <input type="number" id="regional-year-input" value="${savedYear}" min="2014" max="${currentYear}" 
                               style="padding: 6px 10px; border: 1px solid var(--border-strong); border-radius: 4px; font-family: inherit; width: 80px;">

                        <div class="button-group">
                            <button id="month-prev" class="btn-group-item" style="padding: 6px 12px;">&lt;</button>
                            <span id="month-display" style="min-width: 90px; text-align: center; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; font-variant-numeric: tabular-nums;">${monthNames[savedMonth]}</span>
                            <div style="width: 1px; background: var(--border-subtle);"></div>
                            <input type="hidden" id="regional-month-val" value="${savedMonth}">
                            <button id="month-next" class="btn-group-item" style="padding: 6px 12px;">&gt;</button>
                        </div>
                    </div>
                    
                    <span id="map-status" style="font-size: 0.85rem; color: var(--text-muted); margin-left: auto;"></span>
                </div>

                <!-- Map Card -->
                <div class="card chart-card" style="flex: 1; padding: 0.5rem; overflow: hidden; display: flex; flex-direction: column;">
                    <div id="map-wrapper" style="flex: 1; width: 100%; border-radius: 4px; overflow: hidden; position: relative;">
                         <div id="regional-map" style="width: 100%; height: 100%;">
                             <div class="loading-screen">
                                 <div class="spinner"></div>
                                 <p>Lade Karte...</p>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        `;

        // Inject Styles for Comparison Dock (Micro Styles)
        const style = document.createElement('style');
        style.textContent = `
            .micro-input:hover { border-color: var(--success); background: #e8f5e9; }
            .micro-input.active { border-color: var(--success); background: #fff; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); color: #000; }
            .micro-input.filled { background: #e8f5e9; color: var(--success); border-color: #c8e6c9; }
            .micro-btn:hover { color: var(--danger); }
        `;
        this.container.appendChild(style);

        this.initLogic(monthNames);
    }

    async initLogic(monthNames) {
        try {
            const mapContainer = this.container.querySelector('#regional-map');
            if (mapContainer) mapContainer.innerHTML = ''; // Reset content but keep element

            const yearInput = this.container.querySelector('#regional-year-input');
            const monthDisplay = this.container.querySelector('#month-display');
            const monthValInput = this.container.querySelector('#regional-month-val');

            // --- Comparison Logic Init ---
            this.initComparisonLogic();

            // Initial Load
            await this.loadDataAndUpdate(yearInput.value);

            // --- Year Logic ---
            const handleYearChange = async () => {
                let val = parseInt(yearInput.value);
                const min = parseInt(yearInput.min);
                const max = parseInt(yearInput.max);

                if (isNaN(val) || val < min) val = min;
                if (val > max) val = max;

                yearInput.value = val; // Verify UI
                state.set('year', val.toString());
                await this.loadDataAndUpdate(val);
            };

            yearInput.addEventListener('blur', handleYearChange);
            yearInput.addEventListener('change', handleYearChange); // Auto-update on spinner click
            yearInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    yearInput.blur(); // Triggers blur handler
                }
            });

            // --- Month Stepper Logic ---
            const updateMonth = (newMonth) => {
                if (newMonth < 1) newMonth = 12;
                if (newMonth > 12) newMonth = 1;

                monthValInput.value = newMonth;
                monthDisplay.textContent = monthNames[newMonth];
                state.set('month', newMonth.toString());
                this.updateMap();
            };

            this.container.querySelector('#month-prev').addEventListener('click', () => {
                let m = parseInt(monthValInput.value);
                updateMonth(m - 1);
            });

            this.container.querySelector('#month-next').addEventListener('click', () => {
                let m = parseInt(monthValInput.value);
                updateMonth(m + 1);
            });

            // --- Fuel Logic ---
            const fuelBtns = this.container.querySelectorAll('.fuel-toggle-group .btn-group-item');
            fuelBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Update UI - only fuel buttons
                    fuelBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // Update State
                    const fuel = btn.dataset.value;
                    state.set('fuelType', fuel);
                    this.updateMap();
                });
            });

            // Restore "Old Style" Logic but targeting Global Button
            // User requested: "leave the function call as it was"
            const globalA11yBtn = document.getElementById('accessibility-toggle');
            if (globalA11yBtn) {
                // Remove old listeners to be safe
                globalA11yBtn.removeEventListener('click', this.boundHandleA11yToggle);
                globalA11yBtn.addEventListener('click', this.boundHandleA11yToggle);
            }

            // Global State Subscription for Accessibility (Keep this as backup/sync)
            this.unsub = state.subscribe((s, key, value) => {
                if (key === 'colorMode' && this.map) {
                    this.map.options.colorMode = value;
                    this.updateMap();
                }
            });

            this.initComparisonLogic();
        } catch (e) {
            console.error(e);
            this.container.innerHTML += `<p style="color:red">${e.message}</p>`;
        }
    }

    handleA11yToggle() {
        // Logic from old implementation
        if (!this.container || this.container.style.display === 'none') return;

        const current = state.get('colorMode');
        const next = current === 'accessible' ? 'default' : 'accessible';
        state.set('colorMode', next);

        // Update Map explicitly
        if (this.map) {
            this.map.options.colorMode = next;
            this.updateMap();
        }

        // Update UI Button State manually
        const globalA11yBtn = document.getElementById('accessibility-toggle');
        if (globalA11yBtn) {
            globalA11yBtn.classList.toggle('active', next === 'accessible');
        }
    }


    initComparisonLogic() {
        // --- Comparison Dock Logic ---
        let dock = this.container.querySelector('#comparison-dock');
        if (dock) dock.remove();

        // Append to Wrapper (Sibling of Map) so Map.init() doesn't wipe it
        const mapWrapper = this.container.querySelector('#map-wrapper');

        // Micro Dock HTML (Top Right, Very Compact)
        const dockHtml = `
            <div id="comparison-dock" style="
                position: absolute; top: 15px; right: 15px; z-index: 2000;
                display: flex; flex-direction: column; gap: 8px;
                background: #fff; padding: 12px;
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                width: 260px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                border: 1px solid rgba(0,0,0,0.1);
            ">
                <style>
                    .micro-row { display: flex; align-items: center; gap: 8px; }
                    .micro-input {
                        flex: 1; border: 1px solid #e0e0e0; border-radius: 6px; padding: 6px 10px;
                        font-size: 0.85rem; background: #f9f9f9; cursor: pointer; 
                        text-overflow: ellipsis; white-space: nowrap; overflow: hidden; height: 32px;
                        color: #555; transition: all 0.2s; display: flex; align-items: center;
                    }
                    .micro-input:hover { border-color: #a5d6a7; background: #e8f5e9; }
                    .micro-input.active { border-color: #1e8e3e; background: #fff; box-shadow: 0 0 0 2px rgba(30,142,62,0.1); color: #000; }
                    .micro-input.filled { background: #e8f5e9; color: #1b5e20; border-color: #c8e6c9; }
                    
                    .micro-btn { border: none; background: transparent; cursor: pointer; color: #bbb; font-size: 1.1rem; padding: 0 4px; line-height: 1; display:flex; align-items:center; }
                    .micro-btn:hover { color: #1e8e3e; }

                    .micro-badge { 
                        width: 20px; height: 20px; border-radius: 4px; font-size: 10px; 
                        display: flex; align-items: center; justify-content: center; 
                        color: white; font-weight: 700; flex-shrink: 0;
                    }
                    
                    #compare-btn {
                        width: 100%; padding: 8px; background: #333; color: white; border: none;
                        border-radius: 6px; font-size: 0.9rem; font-weight: 600; cursor: pointer; margin-top: 8px;
                        opacity: 0.5; pointer-events: none; transition: all 0.2s;
                    }
                    #compare-btn.ready { opacity: 1; pointer-events: auto; background: #333; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
                    #compare-btn:hover { background: #000; transform: translateY(-1px); }
                </style>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="font-size:0.85rem; font-weight:700; color:#333;">Detailvergleich</span>
                    <span title="Alles zurücksetzen" style="cursor:pointer; font-size:0.8rem; color:#999;" onclick="window.clearAllSlots ? window.clearAllSlots() : null">↺</span>
                </div>

                <!-- Slot A -->
                <div class="micro-row">
                    <div class="micro-badge" style="background:#000;">A</div>
                    <div id="slot-1" class="micro-input active" title="Region A wählen">
                        <span class="text" style="width:100%; overflow:hidden; text-overflow:ellipsis;">...</span>
                    </div>
                    <button class="micro-btn" onclick="window.clearSlot(1)">×</button>
                </div>

                <!-- Slot B -->
                <div class="micro-row">
                    <div class="micro-badge" style="background:#000;">B</div>
                    <div id="slot-2" class="micro-input" title="Region B wählen">
                        <span class="text" style="width:100%; overflow:hidden; text-overflow:ellipsis;">...</span>
                    </div>
                    <button class="micro-btn" onclick="window.clearSlot(2)">×</button>
                </div>

                <button id="compare-btn">Detailvergleich</button>
            </div>
        `;

        mapWrapper.insertAdjacentHTML('beforeend', dockHtml);

        const slot1 = mapWrapper.querySelector('#slot-1');
        const slot2 = mapWrapper.querySelector('#slot-2');
        const btn = mapWrapper.querySelector('#compare-btn');

        let selection = { 1: null, 2: null };
        let activeSlot = 1;

        slot1.onclick = () => { activeSlot = 1; updateUI(); };
        slot2.onclick = () => { activeSlot = 2; updateUI(); };

        window.clearSlot = (id) => {
            selection[id] = null;
            activeSlot = id;
            updateUI();
            updateMapHighlights();
        };

        window.clearAllSlots = () => {
            selection = { 1: null, 2: null };
            activeSlot = 1;
            updateUI();
            updateMapHighlights();
        };

        const updateUI = () => {
            slot1.classList.toggle('active', activeSlot === 1);
            slot2.classList.toggle('active', activeSlot === 2);

            const updateSlotText = (el, data) => {
                const textEl = el.querySelector('.text');
                if (data) {
                    textEl.textContent = `${data.lat.toFixed(2)}, ${data.lon.toFixed(2)}`;
                    el.classList.add('filled');
                } else {
                    textEl.textContent = activeSlot === parseInt(el.id.split('-')[1]) ? 'Auswählen...' : 'Leer';
                    el.classList.remove('filled');
                }
            };
            updateSlotText(slot1, selection[1]);
            updateSlotText(slot2, selection[2]);

            if (selection[1] && selection[2]) btn.classList.add('ready');
            else btn.classList.remove('ready');
        };

        const updateMapHighlights = () => {
            if (!this.map) return;
            const list = [];
            if (selection[1]) list.push({ data: selection[1], slot: 1 });
            if (selection[2]) list.push({ data: selection[2], slot: 2 });
            this.map.highlightRegions(list);
        };

        this.onRegionSelect = (data) => {
            console.log("Region Selected:", data);
            selection[activeSlot] = data;
            if (activeSlot === 1 && !selection[2]) activeSlot = 2;
            else if (activeSlot === 2 && !selection[1]) activeSlot = 1;
            updateUI();
            updateMapHighlights();
        };

        if (this.map) this.map.options.onRegionSelect = this.onRegionSelect;

        btn.onclick = () => {
            if (!selection[1] || !selection[2]) return;
            this.showComparisonModal(selection[1], selection[2]);
        };

        updateUI();
    }

    async showComparisonModal(d1, d2) {
        const year = state.get('year') || new Date().getFullYear();
        const fuel = state.get('fuelType').toUpperCase();

        // Helper to create region ID from coordinates (since cache doesn't have PLZ)
        const getRegionId = (d) => {
            if (d.lat !== undefined && d.lon !== undefined) {
                return `${d.lat.toFixed(1)}_${d.lon.toFixed(1)}`;
            }
            return null;
        };
        const regionId1 = getRegionId(d1);
        const regionId2 = getRegionId(d2);

        if (!regionId1 || !regionId2) {
            alert("Fehler: Konnte Regions-IDs nicht ermitteln. Bitte wähle Regionen mit gültiger Position.");
            return;
        }

        // Show Loading Overlay
        const loadingId = 'modal-loading-' + Date.now();
        document.body.insertAdjacentHTML('beforeend', `
            <div id="${loadingId}" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(255,255,255,0.8); z-index:10000; display:flex; align-items:center; justify-content:center;">
                <div style="font-size:1.5rem; font-weight:bold; color:#333;">Lade historische Daten...</div>
            </div>
        `);

        // Fetch Real History using lat/lon
        let hist1 = [], hist2 = [];
        try {
            const [res1, res2] = await Promise.all([
                fetch(`/api/data/history?year=${year}&lat=${d1.lat}&lon=${d1.lon}`).then(r => r.json()),
                fetch(`/api/data/history?year=${year}&lat=${d2.lat}&lon=${d2.lon}`).then(r => r.json())
            ]);
            hist1 = res1;
            hist2 = res2;
        } catch (e) {
            console.error(e);
            hist1 = [];
            hist2 = [];
        } finally {
            const loader = document.getElementById(loadingId);
            if (loader) loader.remove();
        }

        // Calculate Yearly Averages (Real Data)
        // Note: API returns lowercase fuel keys (e5, e10, diesel)
        const fuelKeyLower = state.get('fuelType').toLowerCase();
        const getAvg = (hist) => {
            if (!hist || !hist.length) return 0;
            const valid = hist.filter(h => h[fuelKeyLower] != null);
            if (!valid.length) return 0;
            const sum = valid.reduce((acc, curr) => acc + (parseFloat(curr[fuelKeyLower]) || 0), 0);
            return sum / valid.length;
        };

        const avg1 = getAvg(hist1);
        const avg2 = getAvg(hist2);

        const diff = avg2 - avg1;
        const diffAbs = Math.abs(diff);
        const cheapest = diff > 0 ? 'A' : (diff < 0 ? 'B' : 'Equal');

        // Load static city lookup JSON (cached after first load)
        // Format: array of {city, latitude, longitude}
        if (!window._cityLookupList) {
            try {
                const res = await fetch('/api/geo/city_lookup');
                window._cityLookupList = await res.json();
            } catch (e) {
                console.error('City lookup load failed:', e);
                window._cityLookupList = [];
            }
        }

        // Nearest neighbor lookup - find closest city in the list
        const getCityName = (lat, lon) => {
            if (!window._cityLookupList || window._cityLookupList.length === 0) {
                return `${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E`;
            }

            let minDist = Infinity;
            let nearestCity = null;
            for (const entry of window._cityLookupList) {
                const dist = (entry.latitude - lat) ** 2 + (entry.longitude - lon) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    nearestCity = entry.city;
                }
            }

            return nearestCity || `${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E`;
        };

        const name1 = getCityName(d1.lat, d1.lon);
        const name2 = getCityName(d2.lat, d2.lon);

        const colorA = '#2e7d32';
        const colorB = '#1565c0';

        const modalHtml = `
            <div id="comp-modal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center; animation: fadeIn 0.2s;">
                <div style="background:white; padding:1.5rem; border-radius:8px; width:95%; max-width:800px; max-height:90vh; overflow-y:auto; box-shadow:0 10px 25px rgba(0,0,0,0.2); position:relative; display:flex; flex-direction:column;">
                    <button onclick="document.getElementById('comp-modal').remove()" style="position:absolute; top:8px; right:8px; border:none; background:none; font-size:1.5rem; cursor:pointer; color:#666;">&times;</button>
                    
                    <h3 style="margin-top:0; text-align:center; color:#333; margin-bottom:1.5rem;">Preisverlauf 2024 (${fuel})</h3>
                    
                    <!-- Header Stats (Averages) -->
                    <div style="display:flex; justify-content:space-around; margin-bottom:1.5rem; gap:1rem;">
                        <div style="text-align:center;">
                            <div class="micro-badge" style="background:${colorA}; color:white; display:inline-block; margin-bottom:4px;">A</div>
                            <div style="font-weight:700; font-size:1.1rem; white-space:nowrap; margin-bottom:0.2rem;">${name1}</div>
                            <div style="font-size:0.8rem; color:#666;">Ø 2024</div>
                            <div style="color:${colorA}; font-weight:800; font-size:1.2rem;">${avg1 > 0 ? avg1.toFixed(3) + ' €' : '-'}</div>
                        </div>
                        <div style="text-align:center; display:flex; align-items:center; font-size:1.2rem; color:#888;">vs</div>
                        <div style="text-align:center;">
                            <div class="micro-badge" style="background:${colorB}; color:white; display:inline-block; margin-bottom:4px;">B</div>
                            <div style="font-weight:700; font-size:1.1rem; white-space:nowrap; margin-bottom:0.2rem;">${name2}</div>
                            <div style="font-size:0.8rem; color:#666;">Ø 2024</div>
                            <div style="color:${colorB}; font-weight:800; font-size:1.2rem;">${avg2 > 0 ? avg2.toFixed(3) + ' €' : '-'}</div>
                        </div>
                    </div>

                    <!-- Chart Container -->
                    <div id="comp-chart-container" style="width:100%; height:320px; min-height:300px; background:#f9f9f9; border-radius:8px; border:1px solid #eee; margin-bottom:1.5rem; position:relative;">
                        <!-- Loader Placeholder -->
                        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#999;">Lade Diagramm...</div>
                    </div>

                    <!-- Conclusion -->
                    <div style="background:${cheapest === 'A' ? '#e8f5e9' : (cheapest === 'B' ? '#e3f2fd' : '#f5f5f5')}; padding:1rem; border-radius:6px; text-align:center; font-size:1.1rem;">
                        ${Math.abs(diff) < 0.001
                ? "Im Jahresdurchschnitt gleich teuer."
                : `Im <strong>Jahresdurchschnitt</strong> war <strong>${cheapest === 'A' ? name1 : name2}</strong> um <strong>${diffAbs.toFixed(3)} €</strong> günstiger.`
            }
                    </div>
                </div>
                <style>
                    @keyframes fadeIn { from { opacity:0; transform:scale(0.98); } to { opacity:1; transform:scale(1); } }
                    .axis line, .axis path { stroke: #ddd; }
                    .axis text { fill: #666; font-size: 10px; }
                </style>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Render Chart - use lowercase fuelKey since API returns lowercase field names
        setTimeout(() => {
            this.renderComparisonChart('#comp-chart-container', hist1, hist2, colorA, colorB, state.get('fuelType').toLowerCase());
        }, 300);
    }

    renderComparisonChart(selector, dataA, dataB, colorA, colorB, fuelKey) {
        const container = document.querySelector(selector);
        if (!container) return;

        // Ensure data is valid numbers
        const cleanData = (arr) => arr.map(d => ({
            ...d,
            val: parseFloat(d[fuelKey])
        })).filter(d => !isNaN(d.val) && d.val > 0);

        const cleanA = cleanData(dataA);
        const cleanB = cleanData(dataB);

        // Check for empty data
        if (cleanA.length === 0 && cleanB.length === 0) {
            container.innerHTML = `
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center; color:#888;">
                    <div style="font-size:2rem; margin-bottom:0.5rem;">📉</div>
                    <div>Keine historischen Daten verfügbar.</div>
                </div>
            `;
            return;
        }

        // Dimensions
        const margin = { top: 20, right: 40, bottom: 30, left: 50 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        // Clear
        container.innerHTML = '';
        const svg = d3.select(container).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const allData = [...cleanA, ...cleanB];
        const priceExtent = d3.extent(allData, d => d.val);
        // Add buffer
        const buffer = (priceExtent[1] - priceExtent[0]) * 0.1 || 0.05;

        const x = d3.scaleLinear().domain([1, 12]).range([0, width]); // Months 1-12
        const y = d3.scaleLinear()
            .domain([priceExtent[0] - buffer, priceExtent[1] + buffer])
            .range([height, 0]);

        // Axes
        const monthNames = ["", "Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .attr("class", "axis")
            .call(d3.axisBottom(x).ticks(12).tickFormat(m => monthNames[m] || m));

        svg.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => d.toFixed(2) + ' €'));

        // Gridlines
        svg.append("g")
            .attr("class", "grid")
            .style("stroke", "#eee")
            .style("stroke-dasharray", "3,3")
            .style("opacity", 0.5)
            .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));

        // Line Generator
        const line = d3.line()
            .x(d => x(d.month))
            .y(d => y(d.val))
            .curve(d3.curveMonotoneX);

        // Draw Lines
        if (cleanA.length > 0) {
            svg.append("path")
                .datum(cleanA)
                .attr("fill", "none")
                .attr("stroke", colorA)
                .attr("stroke-width", 3)
                .attr("d", line);
        }

        if (cleanB.length > 0) {
            svg.append("path")
                .datum(cleanB)
                .attr("fill", "none")
                .attr("stroke", colorB)
                .attr("stroke-width", 3)
                .attr("stroke-dasharray", "5,5")
                .attr("d", line);
        }

        // Hover Dots
        const addDots = (data, color) => {
            svg.selectAll(".dot-" + color.replace('#', ''))
                .data(data)
                .enter().append("circle")
                .attr("cx", d => x(d.month))
                .attr("cy", d => y(d.val))
                .attr("r", 5)
                .attr("fill", "white")
                .attr("stroke", color)
                .attr("stroke-width", 2)
                .style("cursor", "pointer")
                .append("title")
                .text(d => `${d.val.toFixed(3)} € (${monthNames[d.month]})`);
        };

        if (cleanA.length) addDots(cleanA, colorA);
        if (cleanB.length) addDots(cleanB, colorB);
    }

    // Helper to update map without reloading data if year hasn't changed
    updateMap() {
        if (this.map) {
            // Get fuel from active button, or fallback to state
            const activeBtn = this.container.querySelector('.fuel-toggle-group .btn-group-item.active');
            const fuel = activeBtn ? activeBtn.dataset.value : (state.get('fuelType') || 'e10');
            const month = parseInt(this.container.querySelector('#regional-month-val').value);
            // Sync Color Mode just in case it changed via toggle
            this.map.options.colorMode = state.get('colorMode');
            this.map.update(fuel, month);
        }
    }

    async loadDataAndUpdate(year) {
        const mapContainer = this.container.querySelector('#regional-map');
        const status = this.container.querySelector('#map-status');
        if (status) status.textContent = ''; // Clear old status text

        // Show Loading Overlay
        // We'll overlay the map container
        if (mapContainer) {
            mapContainer.style.position = 'relative';
            if (!this.container.querySelector('#map-loader')) {
                const loaderHtml = `
                    <div id="map-loader" style="
                        position: absolute; top:0; left:0; right:0; bottom:0;
                        background: rgba(255,255,255,0.7); z-index: 1000;
                        display: flex; flex-direction: column; align-items: center; justify-content: center;
                        backdrop-filter: blur(2px);
                    ">
                        <div class="spinner"></div>
                        <div style="margin-top: 15px; font-weight: 600; color: #555; font-family: sans-serif;">Lade Daten für ${year}...</div>
                        <style>
                            .spinner {
                                width: 40px; height: 40px;
                                border: 4px solid #f3f3f3; border-top: 4px solid #333;
                                border-radius: 50%;
                                animation: spin 1s linear infinite;
                            }
                            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                        </style>
                    </div>
                `;
                mapContainer.insertAdjacentHTML('beforeend', loaderHtml);
            }
        }

        try {
            const response = await fetch(`/api/data/regional?year=${year}`);

            if (response.status === 404) {
                // No Data for this year
                if (this.map) {
                    this.map.map.remove(); // Destroy map instance
                    this.map = null;
                }
                mapContainer.innerHTML = `
                    <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8f9fa; color:#666;">
                        <div style="font-size:3rem; margin-bottom:1rem;">📅</div>
                        <div style="font-size:1.5rem; font-weight:bold; margin-bottom:0.5rem;">Keine Daten für ${year}</div>
                        <div>Für dieses Jahr liegen leider keine Tankstellendaten vor.</div>
                    </div>
                 `;
                return;
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (!Array.isArray(data)) {
                throw new Error("Ungültiges Datenformat vom Server.");
            }

            // Success - Remove Loader
            const loader = this.container.querySelector('#map-loader');
            if (loader) loader.remove();

            // Check if map container was cleared by error state previously
            if (!mapContainer.querySelector('.leaflet-container') && !this.map) {
                mapContainer.innerHTML = ''; // Clear error message
            }

            const initialMonth = parseInt(this.container.querySelector('#regional-month-val').value);
            // Get fuel from active button, or fallback to state
            const activeBtn = this.container.querySelector('.fuel-toggle-group .btn-group-item.active');
            const initialFuel = activeBtn ? activeBtn.dataset.value : (state.get('fuelType') || 'e10');

            if (!this.map) {
                // If map container is empty (e.g. after error), ensure it's clean
                if (mapContainer.innerHTML.trim().length > 0 && !mapContainer.querySelector('.leaflet-container')) {
                    mapContainer.innerHTML = '';
                }

                this.map = new RegionalMap(mapContainer, data, {
                    fuelType: initialFuel,
                    month: initialMonth,
                    year: parseInt(year),
                    colorMode: state.get('colorMode'),
                    onRegionSelect: (d) => { if (this.onRegionSelect) this.onRegionSelect(d); }
                });
            } else {
                this.map.data = data;
                this.map.options.year = parseInt(year);
                this.map.options.colorMode = state.get('colorMode');
                this.map.update(initialFuel, initialMonth);
            }

        } catch (err) {
            console.error(err);
            const loader = this.container.querySelector('#map-loader');
            if (loader) loader.remove();

            if (this.map) {
                this.map.map.remove();
                this.map = null;
            }
            mapContainer.innerHTML = `
                <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#fee; color:#c00;">
                    <div style="font-size:3rem; margin-bottom:1rem;">⚠️</div>
                    <div style="font-size:1.5rem; font-weight:bold; margin-bottom:0.5rem;">Fehler beim  Laden</div>
                    <div>${err.message || 'Ein unbekannter Fehler ist aufgetreten.'}</div>
                </div>
            `;
        }
    }

    // Called when page becomes visible to fix map rendering issues
    onShow() {
        if (this.map && this.map.map) {
            // Force Leaflet to recalculate map size
            setTimeout(() => {
                this.map.map.invalidateSize();
            }, 100);
        }
    }

    destroy() {
        if (this.map && this.map.destroy) this.map.destroy();
        if (this.unsub) this.unsub();

        const globalA11yBtn = document.getElementById('accessibility-toggle');
        if (globalA11yBtn) {
            globalA11yBtn.removeEventListener('click', this.boundHandleA11yToggle);
        }
    }
}
