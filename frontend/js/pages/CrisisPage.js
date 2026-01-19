
export class CrisisPage {
    constructor() { }

    async render(container) {
        container.innerHTML = `
            <div class="panel-header">
                <h2>⚡ Krisen-Analyse</h2>
            </div>
            <div class="panel-content" style="padding: 0; min-height: 400px;">
                 <!-- Chart Container -->
            </div>
        `;
    }
    destroy() { }
}
