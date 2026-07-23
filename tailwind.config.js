// Build a full 50–950 scale that reads from CSS vars (e.g. --c-emerald-500),
// keeping Tailwind's opacity modifiers working via <alpha-value>.
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const shadeVar = (name) =>
    Object.fromEntries(SHADES.map((s) => [s, `rgb(var(--c-${name}-${s}) / <alpha-value>)`]));

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                primary: '#00B050',
                primaryLight: '#E6F7ED',
                secondary: '#F3F4F6',
                darkText: '#1F2937',
                lightText: '#6B7280',
                // The dept "theme" trio is driven by CSS vars (defaults = stock Tailwind,
                // so every other portal is unchanged). The dept root re-points these vars
                // per college — see [data-dept-accent] blocks in index.css.
                emerald: shadeVar('emerald'),
                green: shadeVar('green'),
                teal: shadeVar('teal'),
            }
        },
    },
    plugins: [],
    darkMode: 'class',
}
