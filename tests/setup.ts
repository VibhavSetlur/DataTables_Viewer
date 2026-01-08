/**
 * Test Setup
 * 
 * Global setup for Vitest test environment.
 */

import { beforeEach, afterEach, vi } from 'vitest';

// =============================================================================
// MOCK localStorage
// =============================================================================

const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        get length() { return Object.keys(store).length; },
        key: vi.fn((index: number) => Object.keys(store)[index] || null)
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// =============================================================================
// MOCK matchMedia
// =============================================================================

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
    }))
});

// =============================================================================
// MOCK ResizeObserver
// =============================================================================

class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', { value: ResizeObserverMock });

// =============================================================================
// MOCK IntersectionObserver
// =============================================================================

class IntersectionObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', { value: IntersectionObserverMock });

// =============================================================================
// MOCK fetch
// =============================================================================

global.fetch = vi.fn();

// =============================================================================
// MOCK clipboard
// =============================================================================

Object.defineProperty(navigator, 'clipboard', {
    value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue('')
    }
});

// =============================================================================
// TEST LIFECYCLE
// =============================================================================

beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Reset localStorage
    localStorageMock.clear();

    // Clear DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // Reset fetch
    (global.fetch as any).mockReset();
});

afterEach(() => {
    vi.restoreAllMocks();
});

// =============================================================================
// GLOBAL TEST UTILITIES
// =============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
    condition: () => boolean,
    timeout = 5000,
    interval = 50
): Promise<void> {
    const startTime = Date.now();

    while (!condition()) {
        if (Date.now() - startTime > timeout) {
            throw new Error('waitFor timeout exceeded');
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
}

/**
 * Create a mock response for fetch
 */
export function mockFetchResponse(data: any, options: ResponseInit = {}): Response {
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
}

/**
 * Setup fetch to return specific data
 */
export function mockFetch(data: any, ok = true): void {
    (global.fetch as any).mockResolvedValueOnce({
        ok,
        status: ok ? 200 : 500,
        json: async () => data,
        text: async () => JSON.stringify(data)
    });
}

// =============================================================================
// CUSTOM MATCHERS
// =============================================================================

declare module 'vitest' {
    interface Assertion<T = any> {
        toBeVisible(): T;
        toHaveClass(className: string): T;
    }
}
