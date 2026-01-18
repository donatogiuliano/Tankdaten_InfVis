export class StateManager {
    constructor() {
        this.state = {
            fuelType: 'e10', // Default
            dateRange: '1y'
        };
        this.listeners = [];
    }

    get(key) {
        return this.state[key];
    }

    set(key, value) {
        this.state[key] = value;
        this.notify(key, value);
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }

    notify(key, value) {
        this.listeners.forEach(cb => cb(key, value, this.state));
    }
}
