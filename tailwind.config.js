/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  safelist: [
    {
      pattern: /(bg|text|border|shadow)-(gray|blue|purple|red|green|amber)-(50|100|200|300|400|500|600|700|900)(\/(10|20|30))?/,
      variants: ['hover', 'dark', 'dark:hover'],
    }
  ],
  theme: {
    extend: {
      colors: {
        app: {
          main: 'var(--bg-main)',
          panel: 'var(--bg-panel)',
          side: 'var(--bg-side)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          hover: 'var(--bg-hover)',
          active: 'var(--bg-active)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          muted: 'var(--text-muted)',
        },
        divider: 'var(--border-main)',
      },
      fontSize: {
        'title': ['12px', {
          lineHeight: '1rem',
          fontWeight: '700',
          letterSpacing: '0.15em',
        }],
        'label-field': ['11px', {
          lineHeight: '1.25rem',
          fontWeight: '600',
        }],
        'label-detail': ['10px', {
          lineHeight: '1rem',
          fontWeight: '400',
        }],
      },
      borderRadius: {
        'main': '8px',
        'modal': '16px',
      }
    },
  },
  plugins: [],
}
