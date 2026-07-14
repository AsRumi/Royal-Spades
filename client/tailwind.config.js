/** Theme tokens live in CSS variables (set by applyTheme) so switching themes
 *  at runtime restyles everything without touching components. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: 'var(--felt)',
        'felt-glow': 'var(--felt-glow)',
        gold: 'var(--gold)',
        'gold-soft': 'var(--gold-soft)',
        accent: 'var(--accent)',
        ivory: 'var(--text-on)',
        night: '#0c0a08',
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        decorative: ['"Cinzel Decorative"', 'Cinzel', 'serif'],
        ui: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 6px 18px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.35)',
        'card-lifted': '0 14px 34px rgba(0,0,0,0.55), 0 4px 10px rgba(0,0,0,0.4)',
        glow: '0 0 24px 4px var(--gold-glow)',
      },
      aspectRatio: {
        card: '5 / 7',
      },
    },
  },
  plugins: [],
};
