
import { state } from './state.js';
import { TrendsPage } from './pages/TrendsPage.js';
import { CrisisPage } from './pages/CrisisPage.js';
import { RegionalPage } from './pages/RegionalPage.js';

class App {
    constructor() {
        this.container = document.getElementById('app-content');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.currentPage = null;

        this.routes = {
            'trends': TrendsPage,
            'crisis': CrisisPage,
            'regional': RegionalPage
        };

        this.init();
    }

    init() {
        // Handle Navigation
        window.addEventListener('hashchange', () => this.handleRoute());

        // Initial Route
        this.handleRoute();
    }

    async handleRoute() {
        const hash = window.location.hash.slice(1) || 'trends';
        const PageClass = this.routes[hash] || TrendsPage;

        // Update Nav UI
        this.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.page === hash);
        });

        // Cleanup old page
        if (this.currentPage) {
            this.currentPage.destroy();
        }

        // Init new page
        this.container.innerHTML = ''; // Clear content
        this.currentPage = new PageClass();
        await this.currentPage.render(this.container);

        // Set initial state for page
        state.set('activePage', hash);
    }
}

// Start App
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
