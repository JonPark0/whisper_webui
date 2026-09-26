/** @type {import('tailwindcss').Config} */
const fallback = ['Pretendard', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'];

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Semantic colors resolve to the CSS custom properties in index.css
      // (Light/Dark handled there), mirroring the Figma "Color" collection.
      colors: {
        canvas: 'var(--color-bg-canvas)',
        surface: 'var(--color-bg-surface)',
        subtle: 'var(--color-bg-subtle)',
        line: 'var(--color-border-default)',
        'line-strong': 'var(--color-border-strong)',
        ink: 'var(--color-text-primary)',
        'ink-2': 'var(--color-text-secondary)',
        'ink-3': 'var(--color-text-tertiary)',
        'on-accent': 'var(--color-text-on-accent)',
        accent: {
          DEFAULT: 'var(--color-accent-default)',
          hover: 'var(--color-accent-hover)',
          subtle: 'var(--color-accent-subtle)',
          text: 'var(--color-accent-text)',
        },
        'control-off': 'var(--color-control-off)',
        info: { bg: 'var(--color-status-info-bg)', text: 'var(--color-status-info-text)', solid: 'var(--color-status-info-solid)' },
        success: { bg: 'var(--color-status-success-bg)', text: 'var(--color-status-success-text)', solid: 'var(--color-status-success-solid)' },
        warning: { bg: 'var(--color-status-warning-bg)', text: 'var(--color-status-warning-text)', solid: 'var(--color-status-warning-solid)' },
        danger: { bg: 'var(--color-status-danger-bg)', text: 'var(--color-status-danger-text)', solid: 'var(--color-status-danger-solid)' },
      },
      fontFamily: {
        display: ['"Exo 2"', ...fallback],
        sans: fallback,
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
        wordmark: ['Anta', '"Exo 2"', ...fallback],
      },
      // Figma text styles: [size, { lineHeight, letterSpacing }]
      fontSize: {
        display: ['56px', { lineHeight: '64px', letterSpacing: '-0.5px' }],
        heading: ['28px', { lineHeight: '36px' }],
        title: ['22px', { lineHeight: '30px' }],
        body: ['15px', { lineHeight: '24px' }],
        label: ['15px', { lineHeight: '20px', letterSpacing: '0.2px' }],
        caption: ['13px', { lineHeight: '18px', letterSpacing: '0.2px' }],
        overline: ['11px', { lineHeight: '16px', letterSpacing: '1.2px' }],
        mono: ['12px', { lineHeight: '16px' }],
        wordmark: ['22px', { lineHeight: '28px', letterSpacing: '0.5px' }],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
