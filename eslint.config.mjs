import typescriptEslint from '@typescript-eslint/eslint-plugin'
import stylistic from '@stylistic/eslint-plugin'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
})

export default [
    ...compat.extends('eslint:recommended', 'plugin:@typescript-eslint/recommended'),
    {
        plugins: {
            '@typescript-eslint': typescriptEslint,
            '@stylistic': stylistic,
        },

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },

            parser: tsParser,
        },

        rules: {
            quotes: ['error', 'single'],
            'no-trailing-spaces': ['error'],
            'object-curly-spacing': ['error', 'always'],
            'comma-dangle': ['error', 'always-multiline'],
            semi: ['error', 'never'],
            '@typescript-eslint/no-non-null-assertion': ['off'],
            '@typescript-eslint/ban-ts-comment': ['off'],
            '@typescript-eslint/no-explicit-any': ['off'],
            '@stylistic/no-extra-semi': ['error'],
            '@stylistic/arrow-parens': ['error'],
            '@stylistic/space-infix-ops': ['error'],
        },
    },
]
