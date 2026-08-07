/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FAFAF6',
        ink: '#1B2430',
        'ink-soft': '#4A5568',
        rule: '#DED9CC',
        teal: {
          DEFAULT: '#2F6F6E',
          soft: '#E3EFEE',
        },
        amber: {
          DEFAULT: '#E8A33D',
          soft: '#FBEBD2',
          deep: '#B5711A',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        graph: 'linear-gradient(#DED9CC 1px, transparent 1px), linear-gradient(90deg, #DED9CC 1px, transparent 1px)',
      },
      backgroundSize: {
        graph: '28px 28px',
      },
    },
  },
  plugins: [],
};
