module.exports = {
  env: {
    browser: true,
    'jest/globals': true,
    es6: true
  },
  extends: ['frontwerk', 'plugin:prettier/recommended'],
  plugins: ['jest', 'svelte3', 'prettier'],
  overrides: [
    {
      files: ['src/**/*.svelte'],
      processor: 'svelte3/svelte3',
      rules: {
        'prettier/prettier': 'off',
        'import/no-mutable-exports': 'off'
      }
    }
  ],
  rules: {
    'prettier/prettier': 'error',
    'import/no-unused-modules': 'off'
  }
};
