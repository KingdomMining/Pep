/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Laboratory-meets-gallery dark palette
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
