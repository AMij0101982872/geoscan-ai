/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          500: '#3b5bdb',
          600: '#2f4ac2',
          700: '#243ba9',
          900: '#1a2e8a',
        }
      }
    }
  },
  plugins: [],
}
