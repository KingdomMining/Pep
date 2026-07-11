/** @type {import('tailwindcss').Config} */
export default {
  // Manual (class-based) dark mode so the theme toggle controls it.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens backed by CSS variables (see index.css). These flip
        // between the light and dark themes; accent colors stay constant.
        page: 'rgb(var(--page) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface-2) / <alpha-value>)',
        content: 'rgb(var(--content) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        // Fixed "display case" dark palette — used for the 3D stages, which
        // stay cinematic dark in BOTH themes so the glass vials always read.
        ink: {
          900: '#050608',
          800: '#0a0c10',
          700: '#0f1219',
          600: '#161a24',
          500: '#20263340',
        },
        accent: {
          teal: '#3fd6c9',
          blue: '#2f9bff',
          green: '#6ee7a8',
          violet: '#b57cff',
          amber: '#ffb14e',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      letterSpacing: {
        tightish: '-0.01em',
        wideish: '0.12em',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.9' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
