import { OverviewPage } from './pages/OverviewPage.js';
import { TrendsPage } from './pages/TrendsPage.js';
import { CrisisPage } from './pages/CrisisPage.js';
import { UkrainePage } from './pages/UkrainePage.js';
import { RegionalPage } from './pages/RegionalPage.js';
import { MarketPhasesPage } from './pages/MarketPhasesPage.js';
import { StateManager } from './utils/StateManager.js';

window.state = new StateManager();

class App {
    constructor() {
        this.container = document.getElementById('content-area');
        this.pages = {};
    }

    async init() {
        // Clear container
        this.container.innerHTML = '';

        // Render ALL Sections (Hidden by default via CSS or JS)
        // await this.renderSection('overview', OverviewPage); // Removed as requested
        await this.renderSection('trends', TrendsPage);
        await this.renderSection('analysis', CrisisPage);
        await this.renderSection('ukraine', UkrainePage);
        try {
            await this.renderSection('phases', MarketPhasesPage);
        } catch (e) {
            console.error("Failed to load MarketPhasesPage", e);
        }
        await this.renderSection('map', RegionalPage);

        // Setup Router
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute(); // Initial Route
    }

    async renderSection(id, PageClass) {
        const section = document.createElement('section');
        section.id = id;
        section.className = 'dashboard-section';
        section.style.display = 'none'; // Hidden by default
        this.container.appendChild(section);

        const pageInstance = new PageClass();
        await pageInstance.render(section);
        this.pages[id] = section;
    }

    handleRoute() {
        // Get Hash or Default to #overview
        let hash = window.location.hash.slice(1) || 'overview';
        const validRoutes = ['overview', 'trends', 'analysis', 'ukraine', 'phases', 'map'];

        if (!validRoutes.includes(hash)) {
            hash = 'trends';
        }

        // Hide all sections, Show active
        Object.values(this.pages).forEach(el => el.style.display = 'none');
        if (this.pages[hash]) {
            this.pages[hash].style.display = 'block';
            this.pages[hash].style.animation = 'fadeIn 0.3s ease-in-out';
        }

        // Update Active Nav
        document.querySelectorAll('.nav-item').forEach(link => {
            const linkHref = link.getAttribute('href').slice(1);
            if (linkHref === hash) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Scroll to top
        window.scrollTo(0, 0);
    }
}

// Global fade animation
const style = document.createElement('style');
style.innerHTML = `
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
