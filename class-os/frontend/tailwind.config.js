import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dce8ff',
          200: '#bdd3ff',
          300: '#93b5ff',
          400: '#6690ff',
          500: '#3d6aff',
          600: '#2147f5',
          700: '#1934e1',
          800: '#1b2db5',
          900: '#1c2d8f',
        },
      },
    },
  },
  plugins: [typography],
};
