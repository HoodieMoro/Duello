/** @type {import('tailwindcss').Config} */
export default {
  content: { relative: true, files: ['./index.html', './src/**/*.{ts,tsx}'] },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f6f6f9',
          100: '#ececf2',
          200: '#d9d9e3',
          300: '#b8b8c8',
          400: '#8b8ba1',
          500: '#66667c',
          600: '#4a4a5c',
          700: '#343443',
          800: '#23232f',
          900: '#17171f',
          950: '#0e0e14',
        },
        p1: { DEFAULT: '#fb7185', soft: '#fb718533', deep: '#e11d48' },
        p2: { DEFAULT: '#38bdf8', soft: '#38bdf833', deep: '#0284c7' },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,.2), 0 6px 20px rgba(0,0,0,.25)',
      },
    },
  },
  plugins: [],
};
