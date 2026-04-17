/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        // Theme-aware semantic tokens (CSS variables)
        'theme-bg':      'var(--bg)',
        'theme-surface': 'var(--surface)',
        'theme-border':  'var(--border)',
        'theme-text':    'var(--text)',
        'theme-accent':  'var(--accent)',
        'theme-accent2': 'var(--accent2)',
        // Legacy ink/cell names now point at CSS variables so existing classes still work
        ink: {
          950: 'var(--bg-deep)',
          900: 'var(--surface)',
          800: 'var(--surface2)',
          700: 'var(--border)',
          600: 'var(--border)',
        },
        cell: {
          on:   'var(--accent)',
          trail:'var(--accent)',
          glow: 'var(--accent)',
        },
      },
    },
  },
  plugins: [],
}
