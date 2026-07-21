import { afterEach, describe, expect, it, vi } from 'vitest';

const nativeToSorted = Object.getOwnPropertyDescriptor(Array.prototype, 'toSorted');

afterEach(() => {
    if (nativeToSorted) {
        Object.defineProperty(Array.prototype, 'toSorted', nativeToSorted);
    } else {
        delete (Array.prototype as { toSorted?: unknown }).toSorted;
    }
    vi.resetModules();
});

describe('Array.toSorted compatibility fallback', () => {
    it('sorts a copy without changing the source array', async () => {
        delete (Array.prototype as { toSorted?: unknown }).toSorted;
        vi.resetModules();

        await import('./arrayPolyfill');

        const source = [3, 1, 2];
        expect(source.toSorted((left, right) => left - right)).toEqual([1, 2, 3]);
        expect(source).toEqual([3, 1, 2]);
        expect(Object.getOwnPropertyDescriptor(Array.prototype, 'toSorted')?.enumerable).toBe(false);
    });
});
