/**
 * Base Component Class
 * Infrastructure for modular UI components
 */

export interface ComponentOptions {
    container: HTMLElement;
    id?: string;
}

export abstract class Component {
    protected container: HTMLElement;
    protected id: string;
    protected dom: Record<string, HTMLElement> = {};

    constructor(options: ComponentOptions) {
        this.container = options.container;
        this.id = options.id || `cmp-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Mount the component to the DOM
     */
    public mount(): void {
        this.render();
        this.bindEvents();
    }

    /**
     * cleanup and remove from DOM
     */
    public destroy(): void {
        this.container.innerHTML = '';
        this.dom = {};
    }

    /**
     * Render the component's HTML
     */
    protected abstract render(): void;

    /**
     * Bind DOM events
     */
    protected abstract bindEvents(): void;

    /**
     * Query and cache DOM elements
     */
    protected cacheDom(selectors: Record<string, string>): void {
        this.dom = {};
        for (const [key, selector] of Object.entries(selectors)) {
            const el = this.container.querySelector(selector);
            if (el) this.dom[key] = el as HTMLElement;
        }
    }
}
