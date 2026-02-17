/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        cozy: {
          50: '#fdf8f0',
          100: '#f9edd8',
          200: '#f3d9af',
          300: '#ecc07e',
          400: '#e4a44e',
          500: '#dd8d2d',
          600: '#cf7422',
          700: '#ac5a1e',
          800: '#8a4820',
          900: '#713c1e',
        },
        dusk: {
          50: '#f5f0f8',
          100: '#e8ddf0',
          200: '#d4bce3',
          300: '#b892ce',
          400: '#9b6ab6',
          500: '#7f4d9a',
          600: '#6a3d80',
          700: '#573169',
          800: '#492b57',
          900: '#3d2649',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in': 'slide-in 0.4s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.15)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
