// eslint.config.js
module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/web-build/**',
      '**/.expo/**'
    ]
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        project: './tsconfig.json'
      }
    },
    plugins: {
      react: require('eslint-plugin-react'),
      'react-native': require('eslint-plugin-react-native'),
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin')
    },
    rules: {
      // React rules
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      
      // React Native rules
      'react-native/no-unused-styles': 'warn',
      'react-native/no-inline-styles': 'warn',
      
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-duplicate-imports': 'error',
      'no-unused-vars': 'off' // Turned off in favor of @typescript-eslint/no-unused-vars
    }
  }
];