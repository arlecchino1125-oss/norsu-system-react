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
            }
        },
    },
    plugins: [],
    darkMode: 'class',
}
