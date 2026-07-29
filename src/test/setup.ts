import '@testing-library/jest-dom/vitest';

// jsdom has no matchMedia. PublicLandingV2 reads it at module load to decide
// whether to give the background video a src at all, so importing that module
// under test throws without this. Defaults to "no match", which is the mobile /
// reduced-motion branch: no video, which is what a test environment wants.
if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
    })) as typeof window.matchMedia;
}
