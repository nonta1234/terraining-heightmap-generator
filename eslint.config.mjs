import withNuxt from './.nuxt/eslint.config.mjs'

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
      'comma-dangle': ['error', 'always-multiline'],
      'no-multiple-empty-lines': 'off',
      'space-before-function-paren': 'off',
      'no-multi-spaces': 'off',
      'no-console': 'off',
      'key-spacing': 'off',
      'no-unused-vars': 'off',
      'no-explicit-any': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/no-v-html': 'off',
      'vue/html-self-closing': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/no-parsing-error': 'off',
      'vue/first-attribute-linebreak': ['error', {
        'singleline': 'ignore',
        'multiline': 'below',
      }],
    },
  },
)
