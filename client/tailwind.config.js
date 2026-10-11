/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: { ink: { 950: '#08080c', 900: '#0f0f16', 850: '#13131c', 800: '#181822' } },
      boxShadow: { glow: '0 0 0 1px rgba(167,139,250,.25), 0 8px 40px -12px rgba(139,92,246,.45)' },
    },
  },
  plugins: [],
};
