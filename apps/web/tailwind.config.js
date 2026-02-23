/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Medieval RPG Palette
        'medieval-bg': '#F2E5C4',      // Paper/Parchment
        'medieval-panel': '#EADBB4',   // Lighter parchment for panels
        'medieval-text': '#1A1A1A',    // Ink black
        'medieval-text-secondary': '#4A4A4A', // Faded ink
        'medieval-accent': '#E6543F',  // Warm red
        'medieval-accent-hover': '#C33D30', // Darker red
        'medieval-metal': '#504338',   // Dark old metal
        'medieval-gold': '#B88745',    // Gold/Bronze
        'medieval-gold-hover': '#D4A055',
        'medieval-border': 'rgba(0,0,0,0.35)', // Ink lines
        'medieval-grid': 'rgba(0,0,0,0.1)',    // Faint grid
      },
      fontFamily: {
        'medieval': ['Departure Mono', 'monospace'], // Keeping Departure Mono as requested, or should we switch? User said "Classic Medieval RPG UI" but didn't specify font change, just style. Let's stick to Departure Mono for now as it fits the "Technical Medieval" vibe, or maybe add a serif if needed later.
        'serif': ['Times New Roman', 'serif'], // Fallback for more traditional look
      },
      backgroundImage: {
        'medieval-paper': 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.08\'/%3E%3C/svg%3E")',
        'medieval-grid': 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M 20 0 L 0 0 0 20\' fill=\'none\' stroke=\'rgba(0,0,0,0.05)\' stroke-width=\'1\'/%3E%3C/svg%3E")',
      },
      boxShadow: {
        'medieval': '2px 2px 0px rgba(0,0,0,0.15)',
        'medieval-hover': '3px 3px 0px rgba(0,0,0,0.2)',
        'medieval-button': 'inset 0 0 0 1px rgba(0,0,0,0.35)',
        'medieval-button-hover': 'inset 0 0 0 1px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.05)',
        'medieval-inset': 'inset 2px 2px 4px rgba(0,0,0,0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}