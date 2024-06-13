module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    browser: true,
  },
  extends: [
    'plugin:@bitrise/base',
    'plugin:@bitrise/formatting',
    'plugin:@bitrise/javascript',
    require.resolve('./.eslintrc-jsdoc'),
  ],
  rules: {
    'no-param-reassign': ['error', { props: false }],
    'class-methods-use-this': 'off',
  },
  overrides: [
    {
      files: ['./src/**/worker.js'],
      rules: {
        'no-return-await': 'off',
        'no-restricted-globals': 'off',
      },
    },
    {
      files: ['./index.js'],
      rules: {
        'no-eval': 'off',
      },
    },
  ],
};
