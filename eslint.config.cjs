const js = require('@eslint/js')
const tseslint = require('typescript-eslint')
const globals = require('globals')
const prettier = require('eslint-config-prettier/flat')

module.exports = [
    {
        ignores: ['dist/**', 'node_modules/**', 'services/backend/templates/**', 'services/frontend/templates/**'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            globals: { ...globals.node, ...globals.jest, ...globals.es2020 },
        },
        rules: {
            // Report the existing style backlog without blocking functional checks.
            'prefer-const': 'warn',
            'no-useless-escape': 'warn',
            'no-useless-assignment': 'warn',
            'no-empty': ['warn', { allowEmptyCatch: true }],
            '@typescript-eslint/no-unused-expressions': 'warn',
            // Generator inputs and runtime hooks currently use explicit any types.
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
    },
    prettier,
]
