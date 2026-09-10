/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6f4',
          100: '#d6e9e4',
          500: '#0f6b56',
          600: '#0c5645',
          700: '#0a4437',
        },
      },
    },
  },
  plugins: [],
};
