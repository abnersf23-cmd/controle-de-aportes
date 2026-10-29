// ESLint: acha erros comuns (variável não usada, hook fora do lugar) antes de rodar o app.
// Formatação (espaços, aspas) é trabalho do Prettier, não do ESLint.
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/', 'node_modules/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node }
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      // Só as duas regras clássicas dos hooks; as novas do React Compiler ficam de fora por enquanto.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off', // o projeto não usa PropTypes
      // Aspas e apóstrofos em texto de tela são normais em português; só barra os que quebram o JSX.
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
      // { campo, ...resto } para tirar um campo do objeto é de propósito.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }]
    }
  }
];
