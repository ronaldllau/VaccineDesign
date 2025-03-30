/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0d6efd',
        'primary-dark': '#0b5ed7',
        'primary-light': '#e7f5ff',
        success: '#198754',
        muted: '#6c757d',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
      },
      spacing: {
        '0.5rem': '0.5rem',
        '1.5rem': '1.5rem',
      },
      borderRadius: {
        'card': '0.5rem',
      },
    },
  },
  plugins: [],
} 