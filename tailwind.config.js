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
    extend: {},
  },
  plugins: [],
}
