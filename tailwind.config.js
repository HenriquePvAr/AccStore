/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#06070b',
        ink: '#0b0f19',
        steel: '#151b27',
        line: 'rgba(255,255,255,0.1)',
        neon: {
          cyan: '#2de2ff',
          green: '#53ff8f',
          violet: '#8b5cf6',
          amber: '#f6c453',
          red: '#ff5f74',
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(45,226,255,0.16)',
        violet: '0 0 42px rgba(139,92,246,0.2)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
