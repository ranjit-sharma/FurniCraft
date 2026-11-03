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
        'page-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0.85' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'dropdown': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(-4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'page-in': 'page-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 150ms ease-out both',
        'fade-out': 'fade-out 120ms ease-in both',
        'sheet-up': 'sheet-up 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pop-in': 'pop-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'dropdown': 'dropdown 160ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 150ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
