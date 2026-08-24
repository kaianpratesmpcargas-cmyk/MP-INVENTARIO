/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#111111',
          dark: '#18181B',
          gray: '#27272A',
          yellow: '#FFD100',
          yellowHover: '#E5BC00',
          yellowLight: '#FFFBEB',
          yellowBorder: '#FDE047',
          green: '#22C55E',
          red: '#EF4444',
          orange: '#F59E0B',
          blue: '#3B82F6',
          purple: '#8B5CF6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'premium-hover': '0 10px 25px -3px rgba(0, 0, 0, 0.08), 0 4px 10px -2px rgba(0, 0, 0, 0.04)',
        'yellow-glow': '0 0 15px rgba(255, 209, 0, 0.35)',
      }
    },
  },
  plugins: [],
}
