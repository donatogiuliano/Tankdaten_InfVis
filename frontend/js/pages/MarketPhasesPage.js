
export class MarketPhasesPage {
    constructor() {
        this.container = null;
        this.data = null;
        this.meta = null;
        
        // Default State
        this.state = {
            year: 2022,
            fuel: 'e10',
            region: '',
            showOil: false,
            // Phase Toggles
            showPhaseGleichlauf: true,
            showPhaseAsymmetrie: true,
            showPhaseVolatility: true,
            showBand: false
        };

        this.colors = {
            phase: {
                'GLEICHLAUF': 'rgba(224, 224, 255, 0.4)', // #e0e0ff
                'ASYMMETRIE': 'rgba(255, 224, 204, 0.4)', // #ffe0cc
                'INTERNE_VOLATILITÄT': 'rgba(232, 213, 242, 0.4)', // #e8d5f2
                'KEINE': 'transparent'
            },
            fuel: '#2196F3',
            oil: '#555',
            band: 'rgba(33, 150, 243, 0.15)'
        };
    }

    async render(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="market-phases-page" style="padding: 1.5rem; height: 100%; display: flex; flex-direction: column; overflow-y: auto;">
                
                <!-- Header -->
                <div style="margin-bottom: 1.5rem;">
                    <h1 style="margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.5rem;">
                        <span>📊</span> Marktphasen-Analyse
                    </h1>
                    <p style="margin: 0; color: #666; font-size: 0.95rem;">
                        Erkennt Marktstabilität, Asymmetrien und Volatilität basierend auf Ölpreis-Dynamik.
                    </p>
                </div>

                <!-- Controls -->
                <div class="controls-bar" style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; margin-bottom: 1rem;">
                    
                    <div class="control-group">
                        <label style="font-size: 0.8rem; font-weight: 600; color: #555; display: block; margin-bottom: 4px;">Jahr</label>
                        <select id="mp-year" style="padding: 6px; border-radius: 4px; border: 1px solid #ddd;">
                            <option value="2024">2024</option>
                            <option value="2023">2023</option>
                            <option value="2022" selected>2022</option>
                            <option value="2021">2021</option>
                            <option value="2020">2020</option>
                            <option value="2019">2019</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label style="font-size: 0.8rem; font-weight: 600; color: #555; display: block; margin-bottom: 4px;">Kraftstoff</label>
                        <select id="mp-fuel" style="padding: 6px; border-radius: 4px; border: 1px solid #ddd;">
                            <option value="e5">Super E5</option>
                            <option value="e10" selected>Super E10</option>
                            <option value="diesel">Diesel</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label style="font-size: 0.8rem; font-weight: 600; color: #555; display: block; margin-bottom: 4px;">Stadt / Region</label>
                        <input type="text" id="mp-city-input" list="mp-city-list" placeholder="Stadt eingeben..." style="padding: 6px; border-radius: 4px; border: 1px solid #ddd; width: 140px;">
                        <datalist id="mp-city-list"></datalist>
                        <!-- Hidden storage for the actual PLZ sent to API -->
                        <input type="hidden" id="mp-region" value="">
                    </div>

                    <div style="width: 1px; height: 30px; background: #eee; margin: 0 0.5rem;"></div>

                    <div class="toggles" style="display: flex; gap: 1rem; align-items: center;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                            <input type="checkbox" id="mp-toggle-oil"> Ölpreis
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                            <input type="checkbox" id="mp-toggle-band"> Vol.-Band
                        </label>
                    </div>
                </div>

                <!-- Filters for Phases -->
                 <div class="phase-filters" style="background: white; padding: 0.8rem 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 1rem; display: flex; gap: 1.5rem; justify-content: flex-start; align-items: center;">
                    <span style="font-size: 0.85rem; font-weight: 600; color: #555;">Phasen anzeigen:</span>
                    
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                        <input type="checkbox" id="mp-toggle-p-gleichlauf" checked> 
                        <span style="width: 10px; height: 10px; background: ${this.colors.phase['GLEICHLAUF']}; border: 1px solid #ccc; display: inline-block;"></span>
                        Gleichlauf
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                        <input type="checkbox" id="mp-toggle-p-asymmetrie" checked>
                        <span style="width: 10px; height: 10px; background: ${this.colors.phase['ASYMMETRIE']}; border: 1px solid #ccc; display: inline-block;"></span>
                        Asymmetrie
                    </label>

                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9rem;">
                        <input type="checkbox" id="mp-toggle-p-volatility" checked>
                        <span style="width: 10px; height: 10px; background: ${this.colors.phase['INTERNE_VOLATILITÄT']}; border: 1px solid #ccc; display: inline-block;"></span>
                        Interne Volatilität
                    </label>
                </div>

                <!-- Chart Container -->
                <div class="chart-card" style="flex: 1; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 1.5rem; min-height: 400px; position: relative; display: flex; flex-direction: column;">
                    <div id="mp-chart" style="width: 100%; flex: 1; position: relative;"></div>
                    
                    <!-- Tooltip -->
                    <div id="mp-tooltip" style="position: absolute; display: none; background: rgba(255,255,255,0.95); color: #333; padding: 12px; border-radius: 8px; font-size: 0.85rem; pointer-events: none; z-index: 100; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border: 1px solid #eee; min-width: 200px;"></div>

                    <!-- Legend -->
                    <div style="margin-top: 1rem; display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; font-size: 0.8rem; color: #666; border-top: 1px solid #eee; padding-top: 1rem;">
                        <!-- Data Series -->
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 20px; height: 3px; background: ${this.colors.fuel};"></span>
                            Tankpreis (Ø)
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 12px; height: 12px; background: ${this.colors.band}; border: 1px solid #ccc;"></span>
                            Volatilitätsband
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 20px; height: 2px; border-bottom: 2px dashed ${this.colors.oil}; height:0;"></span>
                            Ölpreis (Brent)
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.loadData(); // Non-blocking load
    }

    bindEvents() {
        // PLZ Mapping: Statische Datei laden & Datalist befüllen
        let plzMap = {}; // PLZ -> City
        let cityToPlz = {}; // City -> PLZ (Reverse Map)

        fetch('js/data/plz3_cities.json')
            .then(r => r.json())
            .then(data => { 
                plzMap = data; 
                
                // Build Datastore & Reverse Map
                const datalist = this.container.querySelector('#mp-city-list');
                const uniqueCities = new Set();
                
                Object.entries(data).forEach(([plz, city]) => {
                    // Reverse Map: Keep first PLZ found for a city (simplification)
                    if (!cityToPlz[city]) cityToPlz[city] = plz;
                    uniqueCities.add(city);
                });

                // Sort and populate datalist
                Array.from(uniqueCities).sort().forEach(city => {
                    const option = document.createElement('option');
                    option.value = city;
                    datalist.appendChild(option);
                });
            })
            .catch(e => console.warn('Konnte PLZ-Mapping nicht laden', e));

        const update = () => {
            this.state.year = this.container.querySelector('#mp-year').value;
            this.state.fuel = this.container.querySelector('#mp-fuel').value;
            
            // City Input Resolution
            const cityInput = this.container.querySelector('#mp-city-input').value.trim();
            const regionHidden = this.container.querySelector('#mp-region');
            
            // Logic: 
            // 1. Check if input matches a City Name -> use Reverse Map
            // 2. Check if input is a PLZ (fallback) -> use it directly
            // 3. Else -> Empty (All regions)
            
            if (cityToPlz[cityInput]) {
                this.state.region = cityToPlz[cityInput];
            } else if (cityInput.match(/^\d+$/)) {
                // User typed PLZ directly
                this.state.region = cityInput; 
            } else {
                 this.state.region = ''; // Reset if invalid
            }
            
            // Debug viz (optional)
            // console.log(`Searching for: ${cityInput} -> PLZ: ${this.state.region}`);

            this.loadData();
        };

        const toggles = () => {
            this.state.showOil = this.container.querySelector('#mp-toggle-oil').checked;
            this.state.showBand = this.container.querySelector('#mp-toggle-band').checked;
            
            // Phase Toggles
            this.state.showPhaseGleichlauf = this.container.querySelector('#mp-toggle-p-gleichlauf').checked;
            this.state.showPhaseAsymmetrie = this.container.querySelector('#mp-toggle-p-asymmetrie').checked;
            this.state.showPhaseVolatility = this.container.querySelector('#mp-toggle-p-volatility').checked;

            this.renderChart(); // Kein Reload nötig, nur Re-Render
        };

        this.container.querySelector('#mp-year').addEventListener('change', update);
        this.container.querySelector('#mp-fuel').addEventListener('change', update);
        
        // Use 'change' for datalist selection + 'input' with debounce could be nice, but 'change' is safer for now
        this.container.querySelector('#mp-city-input').addEventListener('change', update);
        this.container.querySelector('#mp-city-input').addEventListener('blur', update); // Ensure update on leave

        this.container.querySelector('#mp-toggle-oil').addEventListener('change', toggles);
        this.container.querySelector('#mp-toggle-band').addEventListener('change', toggles);
        
        // New Phase Toggles
        this.container.querySelector('#mp-toggle-p-gleichlauf').addEventListener('change', toggles);
        this.container.querySelector('#mp-toggle-p-asymmetrie').addEventListener('change', toggles);
        this.container.querySelector('#mp-toggle-p-volatility').addEventListener('change', toggles);
    }

    async loadData() {
        const chartDiv = this.container.querySelector('#mp-chart');
        chartDiv.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;">Lade Analyse...</div>';

        try {
            const params = new URLSearchParams({
                year: this.state.year,
                fuel: this.state.fuel,
                region: this.state.region
            });

            const res = await fetch(`/api/data/market-phases?${params.toString()}`);
            if (!res.ok) throw new Error('Fehler beim Laden der Daten');
            
            const json = await res.json();
            this.data = json.timeseries;
            this.meta = json.phases; // Phasen-Intervalle
            this.metaData = json.meta; // Meta-Informationen

            // Datum parsen
            const parseDate = d3.timeParse('%Y-%m-%d');
            this.data.forEach(d => {
                d.parsedDate = parseDate(d.date);
            });
            this.meta.forEach(m => {
                m.startParsed = parseDate(m.start_date);
                m.endParsed = parseDate(m.end_date);
            });

            this.renderChart();

        } catch (e) {
            console.error(e);
            chartDiv.innerHTML = `<div style="color:red;text-align:center;padding:2rem;">Fehler: ${e.message}</div>`;
        }
    }

    renderChart() {
        if (!this.data || this.data.length === 0) return;

        const container = this.container.querySelector('#mp-chart');
        container.innerHTML = '';
        const tooltip = this.container.querySelector('#mp-tooltip');

        // Dimensions
        const margin = { top: 20, right: 60, bottom: 30, left: 50 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleTime()
            .domain(d3.extent(this.data, d => d.parsedDate))
            .range([0, width]);

        const yFuel = d3.scaleLinear()
            .domain([
                d3.min(this.data, d => d.price_mean) * 0.95, 
                d3.max(this.data, d => d.price_mean) * 1.05
            ])
            .range([height, 0]);

        // Draw Phases Background (Filtered)
        if (this.meta) {
            // Filter phases based on state
            const visiblePhases = this.meta.filter(d => {
                if (d.phase === 'GLEICHLAUF') return this.state.showPhaseGleichlauf;
                if (d.phase === 'ASYMMETRIE') return this.state.showPhaseAsymmetrie;
                if (d.phase === 'INTERNE_VOLATILITÄT') return this.state.showPhaseVolatility;
                return false;
            });

            svg.selectAll('.phase-rect')
                .data(visiblePhases)
                .enter()
                .append('rect')
                .attr('x', d => x(d.startParsed))
                .attr('width', d => Math.max(2, x(d.endParsed) - x(d.startParsed)))
                .attr('y', 0)
                .attr('height', height)
                .attr('fill', d => this.colors.phase[d.phase] || 'transparent')
                .on('mouseover', (e, d) => {
                    tooltip.style.display = 'block';
                    tooltip.innerHTML = `
                        <strong>Phase: ${d.phase}</strong><br>
                        ${d.start_date} bis ${d.end_date}<br>
                        Dauer: ${d.duration_days} Tage<br>
                        <div style="margin-top:4px; font-size:0.8em; color:#666;">
                            Ø Korrelation: ${d.avg_correlation ? d.avg_correlation.toFixed(2) : '-'}<br>
                            Ø Lag: ${d.avg_lag ? d.avg_lag.toFixed(1) : '-'} Tage
                        </div>
                    `;
                })
                .on('mousemove', (e) => {
                    tooltip.style.left = (e.pageX + 15) + 'px';
                    tooltip.style.top = (e.pageY - 10) + 'px';
                })
                .on('mouseout', () => {
                    tooltip.style.display = 'none';
                });
        }

        // Axes
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat('%b')));

        svg.append('g')
            .call(d3.axisLeft(yFuel).ticks(5))
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.1).attr('x2', width)); // Grid lines

        // Add Oil Axis if toggled
        if (this.state.showOil && this.metaData.oil_available) {
            const yOil = d3.scaleLinear()
                .domain([
                    d3.min(this.data, d => d.brent_oil_eur) * 0.9,
                    d3.max(this.data, d => d.brent_oil_eur) * 1.1
                ])
                .range([height, 0]);

            svg.append('g')
                .attr('transform', `translate(${width}, 0)`)
                .call(d3.axisRight(yOil).ticks(5))
                .call(g => g.selectAll('text').attr('fill', this.colors.oil));

            // Oil Line
            const lineOil = d3.line()
                .defined(d => d.brent_oil_eur !== null)
                .x(d => x(d.parsedDate))
                .y(d => yOil(d.brent_oil_eur))
                .curve(d3.curveMonotoneX);

            svg.append('path')
                .datum(this.data)
                .attr('fill', 'none')
                .attr('stroke', this.colors.oil)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '4,4')
                .attr('d', lineOil);
        }

        // Fuel Line (MA7)
        const lineFuel = d3.line()
            .defined(d => d.price_ma7 !== null)
            .x(d => x(d.parsedDate))
            .y(d => yFuel(d.price_ma7))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(this.data)
            .attr('fill', 'none')
            .attr('stroke', this.colors.fuel)
            .attr('stroke-width', 3)
            .attr('d', lineFuel);

        // Volatility Band (Mean +/- StdDev)
        if (this.state.showBand) {
            const areaBand = d3.area()
                .defined(d => d.price_mean !== null && d.price_std !== null)
                .x(d => x(d.parsedDate))
                .y0(d => yFuel(d.price_mean - d.price_std))
                .y1(d => yFuel(d.price_mean + d.price_std))
                // User requested "sharper" look -> Linear instead of MonotoneX
                .curve(d3.curveLinear);

            svg.append('path')
                .datum(this.data)
                .attr('fill', this.colors.band) // Blue transparent (defined in constructor)
                .attr('stroke', 'none')
                .attr('class', 'volatility-band')
                .attr('d', areaBand);
        }
        
        // Handling "No Oil Data" Warning
        if (!this.metaData.oil_available) {
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', '#999')
                .style('font-size', '1.2rem')
                .text('⚠️ Keine Ölpreisdaten für dieses Jahr verfügbar');
        }
    }
}
