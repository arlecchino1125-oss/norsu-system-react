import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsivePageSize, getResponsivePageSize } from './useResponsivePageSize';

describe('getResponsivePageSize', () => {
    it('returns 10 for heights >= 1050px', () => {
        expect(getResponsivePageSize(1050)).toBe(10);
        expect(getResponsivePageSize(1200)).toBe(10);
    });

    it('returns 8 for heights between 900px and 1049px', () => {
        expect(getResponsivePageSize(900)).toBe(8);
        expect(getResponsivePageSize(1000)).toBe(8);
        expect(getResponsivePageSize(1049)).toBe(8);
    });

    it('returns 7 for heights between 760px and 899px', () => {
        expect(getResponsivePageSize(760)).toBe(7);
        expect(getResponsivePageSize(800)).toBe(7);
        expect(getResponsivePageSize(899)).toBe(7);
    });

    it('returns 5 for heights between 640px and 759px', () => {
        expect(getResponsivePageSize(640)).toBe(5);
        expect(getResponsivePageSize(700)).toBe(5);
        expect(getResponsivePageSize(759)).toBe(5);
    });

    it('returns 4 for heights between 500px and 639px', () => {
        expect(getResponsivePageSize(500)).toBe(4);
        expect(getResponsivePageSize(600)).toBe(4);
        expect(getResponsivePageSize(639)).toBe(4);
    });

    it('returns 3 for heights < 500px', () => {
        expect(getResponsivePageSize(499)).toBe(3);
        expect(getResponsivePageSize(480)).toBe(3);
        expect(getResponsivePageSize(0)).toBe(3);
    });
});

describe('useResponsivePageSize hook', () => {
    const originalInnerHeight = window.innerHeight;

    afterEach(() => {
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: originalInnerHeight
        });
    });

    it('initializes with page size based on window.innerHeight', () => {
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 950
        });

        const { result } = renderHook(() => useResponsivePageSize());
        expect(result.current).toBe(8);
    });

    it('updates dynamically when window resize occurs', () => {
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 950
        });

        const { result } = renderHook(() => useResponsivePageSize());
        expect(result.current).toBe(8);

        // Simulate resize to compact screen
        act(() => {
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                configurable: true,
                value: 450
            });
            window.dispatchEvent(new Event('resize'));
        });

        expect(result.current).toBe(3);

        // Simulate resize to tall screen
        act(() => {
            Object.defineProperty(window, 'innerHeight', {
                writable: true,
                configurable: true,
                value: 1200
            });
            window.dispatchEvent(new Event('resize'));
        });

        expect(result.current).toBe(10);
    });
});
