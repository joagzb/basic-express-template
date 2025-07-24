import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import jestPlugin from 'eslint-plugin-jest';

export default [
  js.configs.recommended,

  {
    files: ['**/*.ts'],
    ignores: ['jest.config.js'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly'
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-invalid-this': 'off',
      'no-duplicate-imports': 'error',
      'dot-notation': 'error',
      eqeqeq: 'error',
      'no-alert': 'error',
      'no-global-assign': 'error',
      'spaced-comment': ['error', 'always'],
      'prefer-template': 'error',
      'prefer-const': 'error',
      'array-bracket-newline': ['error', { minItems: 5 }],
      'array-element-newline': ['error', { minItems: 5 }],
      'multiline-ternary': 0,
      'no-multi-spaces': 'error',
      'newline-per-chained-call': ['error', { ignoreChainWithDepth: 3 }],
      'no-useless-escape': 0,
      'brace-style': 'error',
      'no-multiple-empty-lines': 'error',
      'operator-linebreak': ['error', 'none'],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'prettier/prettier': 'error',
    },
  },
  {
  files: ['**/*.test.ts'],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      project: './tsconfig.json',
    },
    globals: {
      test: 'readonly',
      describe: 'readonly',
      expect: 'readonly',
      beforeEach: 'readonly',
      afterEach: 'readonly',
    },
  },
  plugins: {
    '@typescript-eslint': tsPlugin,
    prettier: prettierPlugin,
    jest: jestPlugin,
  },
  rules: {
    'prettier/prettier': 'error',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',
  },
}

];
