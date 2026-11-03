/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fbf8f3',
          100: '#f5eee2',
          200: '#ebd9c1',
          300: '#dec09d',
          400: '#cfa276',
          500: '#b8814c', // Warm rich wood/amber tone for modern craft
          600: '#9d663b',
          700: '#7e4f30',
          800: '#67402c',
          900: '#543627',
          950: '#301c13',
        },
        slatewood: {
          50: '#f6f7f9',
          100: '#eceff3',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      keyframes: {
        'page-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'page-in': 'page-in 220ms ease-out both',
        'fade-in': 'fade-in 180ms ease-out both',
        'sheet-up': 'sheet-up 280ms cubic-bezier(0.32, 0.72, 0, 1) both',
        'pop-in': 'pop-in 180ms ease-out both',
      },
    },
  },
  plugins: [],
}
