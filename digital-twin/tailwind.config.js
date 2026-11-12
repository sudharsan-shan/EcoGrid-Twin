/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        solar: '#10b981',
        battery: '#06b6d4',
        grid: '#f59e0b',
        load: '#a855f7',
      }
    },
  },
  plugins: [],
}
