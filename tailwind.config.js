// As cores vêm de variáveis CSS (src/index.css), assim o tema claro/escuro muda em um lugar só.
const token = name => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        surface2: token('surface2'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        faint: token('faint'),
        accent: token('accent'),
        good: token('good'),
        bad: token('bad'),
        warn: token('warn'),
        info: token('info')
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'] },
      borderRadius: { xl2: '1.25rem' }
    }
  }
};
