import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        surface: '#FAFAF8',
        'surface-raised': '#FFFFFF',
        ink: '#1C1E22',
        'ink-muted': '#5B5F68',
        line: '#E3E1DC',
        signal: '#C1631E',
        success: '#2F7D5C',
        warning: '#B8860B',
        error: '#A63A2E',
        info: '#3E5C76',
        'dark-surface': '#14161A',
        'dark-surface-raised': '#1B1E24',
        'dark-ink': '#EDEDEA',
        'dark-line': '#2A2D33',
      },
    },
  },
  plugins: [],
}

export default config
