import withNuxt from './.nuxt/eslint.config.mjs'
import stylistic from '@stylistic/eslint-plugin'

export default withNuxt(
  {
    files: ['**/*.js'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.vue', '**/*.ts'],
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      'no-explicit-any': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/html-self-closing': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/no-parsing-error': 'off',
      'vue/first-attribute-linebreak': ['error', {
        singleline: 'ignore',
        multiline: 'ignore',
      }],
    },
  },
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: false,
  }),
  {
    plugins: stylistic,
    rules: {
      '@stylistic/brace-style': 'off',
      '@stylistic/max-statements-per-line': ['error', { max: 2 }],
      '@stylistic/no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
      '@stylistic/no-multi-spaces': ['error', { ignoreEOLComments: true }],
    },
  },
)
