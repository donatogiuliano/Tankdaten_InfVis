
class StateManager {
    constructor() {
        // Default State
        const defaults = {
            fuelType: 'e10', // e5, e10, diesel
            year: new Date().getFullYear().toString(),
            month: '1',
            activePage: 'overview',
            colorMode: 'default' // 'default' or 'accessible'
        };

        // Load from LocalStorage
        const saved = JSON.parse(localStorage.getItem('fuelApp_settings') || '{}');

        this.state = { ...defaults, ...saved };
        this.listeners = [];
    }

    get(key) {
        return this.state[key];
    }

    set(key, value) {
        if (this.state[key] !== value) {
            this.state[key] = value;

            // Persist to LocalStorage
            this.save();

            this.notify(key, value);
        }
    }

    save() {
        localStorage.setItem('fuelApp_settings', JSON.stringify({
            fuelType: this.state.fuelType,
            year: this.state.year,
            month: this.state.month,
            colorMode: this.state.colorMode
        }));
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
