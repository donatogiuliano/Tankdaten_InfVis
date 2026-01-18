
// Mock data generator for development until we have real JSONs
function generateDummyTrendData(days = 365) {
    const data = [];
    let price = 1.70;
    const today = new Date('2024-12-31');

    for (let i = days; i > 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        // Random walk
        price += (Math.random() - 0.5) * 0.05;
        // Seasonal trend (cheaper in winter, expensive in summer)
        const month = date.getMonth();
        if (month > 4 && month < 8) price += 0.005;

        data.push({
            date: date.toISOString().split('T')[0],
            price_mean: price,
            price_min: price - 0.05,
            price_max: price + 0.05,
            price_std: Math.random() * 0.04 + 0.01,
            ma_7d: price // Simplification
        });
    }

    // Calculate proper MA
    for (let i = 7; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < 7; j++) sum += data[i - j].price_mean;
        data[i].ma_7d = sum / 7;
    }

    return data;
}

function generateDummyCrisisData() {
    // Generate data specifically highlighting "crisis" events
    const data = generateDummyTrendData(730); // 2 years
    // Inject crisis: March 2022 (Ukraine)
    data.forEach(d => {
        if (d.date.startsWith('2022-03')) {
            d.price_mean += 0.50;
            d.price_std += 0.15; // High volatility
        }
        if (d.date.startsWith('2022-06')) {
            d.price_mean -= 0.30; // Tankrabatt
        }
    });
    return data;
}

function generateDummyRegionalData() {
    const regions = [
        { id: '70', name: 'Stuttgart', price: 1.78 },
        { id: '76', name: 'Karlsruhe', price: 1.74 },
        { id: '68', name: 'Mannheim', price: 1.72 },
        { id: '79', name: 'Freiburg', price: 1.76 },
        { id: '89', name: 'Ulm', price: 1.73 },
        { id: '78', name: 'Konstanz', price: 1.79 }
    ];

    return regions.map(r => ({
        ...r,
        price_mean: r.price + (Math.random() - 0.5) * 0.1,
        rank: 0 // wil be calculated
    })).sort((a, b) => b.price_mean - a.price_mean)
        .map((r, i) => ({ ...r, rank: i + 1 }));
}


class ApiService {
    constructor() {
        this.baseUrl = 'http://localhost:5000/api';
    }

    async getTrendData(fuelType) {
        return this._fetchJson(`/trends?fuel=${fuelType}`);
    }

    async getCrisisData(fuelType) {
        // Crisis endpoints repurposes trend data + specific event metadata if needed
        return this._fetchJson(`/crisis?fuel=${fuelType}`);
    }

    async getRegionalData(fuelType) {
        return this._fetchJson(`/regional?fuel=${fuelType}`);
    }

    async getMapData(fuelType) {
        return this._fetchJson(`/map?fuel=${fuelType}`);
    }

    async getHeatmapData(fuelType) {
        return this._fetchJson(`/heatmap?fuel=${fuelType}`);
    }

    async _fetchJson(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to load ${endpoint}:`, error);
            // Fallback empty array to prevent crashes
            return [];
        }
    }
}

export const api = new ApiService();
