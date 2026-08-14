import { useState, useEffect } from 'react';

export interface ResponsiveBreakpoint {
    /** Minimum window height in pixels for this breakpoint */
    minHeight: number;
    /** Number of items to display per page */
    pageSize: number;
}

/**
 * Standard height-based breakpoints for dashboard tables:
 * - >= 1050px (Large / high-res displays / fullscreen): 10 rows
 * - >= 900px  (Tall 1080p desktop): 8 rows
 * - >= 760px  (Standard laptop screen / 1080p with browser chrome): 7 rows
 * - >= 640px  (Compact laptops / 768p displays): 5 rows
 * - >= 500px  (Split screen / small tablets): 4 rows
 * - < 500px   (Compact / mobile / low height): 3 rows
 */
const DEFAULT_HEIGHT_BREAKPOINTS: ResponsiveBreakpoint[] = [
    { minHeight: 1050, pageSize: 10 },
    { minHeight: 900, pageSize: 8 },
    { minHeight: 760, pageSize: 7 },
    { minHeight: 640, pageSize: 5 },
    { minHeight: 500, pageSize: 4 },
    { minHeight: 0, pageSize: 3 }
];

export function getResponsivePageSize(
    height: number,
    breakpoints: ResponsiveBreakpoint[] = DEFAULT_HEIGHT_BREAKPOINTS
): number {
    for (const bp of breakpoints) {
        if (height >= bp.minHeight) {
            return bp.pageSize;
        }
    }
    return 5;
}

export function useResponsivePageSize(
    breakpoints: ResponsiveBreakpoint[] = DEFAULT_HEIGHT_BREAKPOINTS
): number {
    const [pageSize, setPageSize] = useState<number>(() => {
        if (typeof window === 'undefined') return 5;
        return getResponsivePageSize(window.innerHeight, breakpoints);
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const updateSize = () => {
            const nextSize = getResponsivePageSize(window.innerHeight, breakpoints);
            setPageSize((prev) => (prev !== nextSize ? nextSize : prev));
        };

        // Initialize and listen to resize
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [breakpoints]);

    return pageSize;
}

export default useResponsivePageSize;
