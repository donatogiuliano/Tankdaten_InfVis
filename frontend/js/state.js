
class StateManager {
    constructor() {
        this.state = {
            fuelType: 'e10', // e5, e10, diesel
            dateRange: null, // { start, end }
            activePage: 'trends'
        };
        this.listeners = [];
    }

    get(key) {
        return this.state[key];
    }

    set(key, value) {
        if (this.state[key] !== value) {
            this.state[key] = value;
            this.notify(key, value);
        }
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify(key, value) {
        this.listeners.forEach(listener => listener(this.state, key, value));
    }
}

export const state = new StateManager();
