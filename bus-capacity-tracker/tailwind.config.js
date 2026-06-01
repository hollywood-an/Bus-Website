/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        'line-2': 'var(--line-2)',
        scarlet: 'var(--scarlet)',
        'scarlet-ink': 'var(--scarlet-ink)',
        'scarlet-wash': 'var(--scarlet-wash)',
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        cap: {
          0: 'var(--cap-0)',
          1: 'var(--cap-1)',
          2: 'var(--cap-2)',
          3: 'var(--cap-3)',
          4: 'var(--cap-4)',
        },
      },
      fontFamily: {
        sans: ['Archivo Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono Variable', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) * 1.4)',
      },
      boxShadow: {
        float: 'var(--shadow-float)',
      },
      transitionTimingFunction: {
        out: 'var(--ease)',
      },
    },
  },
  plugins: [],
};
