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
    },
  },
  plugins: [],
}
