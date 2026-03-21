/** @type {import('tailwindcss').Config} */
export default {
  content: ['./renderer/**/*.{html,jsx,js}'],
  theme: {
    extend: {
      colors: {
        abhiflow: {
          50: '#f0f5ff',
          100: '#e0eaff',
          500: '#4f6ef7',
          600: '#3b5ce4',
          700: '#2d4ad0',
          800: '#1e38b0',
          900: '#152a8a',
        },
      },
    },
  },
  plugins: [],
};
