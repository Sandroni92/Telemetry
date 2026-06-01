/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        racing: {
          bg: '#0a0c10',
          panel: '#12151c',
          panel2: '#171b24',
          border: '#232834',
          accent: '#e10600', // ACC / F1 red
          green: '#22c55e',
          amber: '#f59e0b',
          cyan: '#06b6d4',
          purple: '#a855f7'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      keyframes: {
        'pulse-fast': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' }
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'pulse-fast': 'pulse-fast 1s ease-in-out infinite',
        'fade-in': 'fade-in 0.25s ease-out'
      }
    }
  },
  plugins: []
}
