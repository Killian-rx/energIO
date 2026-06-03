/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#1e40af', light: '#3b82f6', dark: '#1e3a8a' },
        success:   { DEFAULT: '#059669', light: '#34d399' },
        warning:   { DEFAULT: '#d97706', light: '#fbbf24' },
        danger:    { DEFAULT: '#dc2626', light: '#f87171' },
      },
    },
  },
  plugins: [],
};
