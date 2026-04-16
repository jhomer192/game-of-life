/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        ink: {
          950: '#06080d',
          900: '#0b0f17',
          800: '#111826',
          700: '#1b2436',
          600: '#2a364f',
        },
        cell: {
          on: '#7dd3fc',
          trail: '#38bdf8',
          glow: '#0ea5e9',
        },
      },
    },
  },
  plugins: [],
}
