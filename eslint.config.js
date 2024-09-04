import globals from 'globals'
import pluginJs from '@eslint/js'
import pluginReact from 'eslint-plugin-react'
import pluginTs from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import stylistic from '@stylistic/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import typescriptEslint from '@typescript-eslint/eslint-plugin'

export default [
    {
        files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
        ignores: ['**/dist/**'],

        languageOptions: {
            globals: globals.browser,
            parser: tsParser,
        },

        settings: {
            react: {
                version: '18',
            },
        },

        plugins: {
            'js': pluginJs,
            'react': pluginReact,
            'vue': pluginVue,
            '@stylistic': stylistic,
            '@typescript-eslint': typescriptEslint,
        },

        rules: {
            ...pluginJs.configs.recommended.rules,
            ...pluginTs.configs.recommended.reduce((carry, config) => ({ ...carry, ...config.rules }), {}),
            ...pluginReact.configs.flat.recommended.rules,
            ...pluginVue.configs['flat/recommended'].reduce((carry, config) => ({ ...carry, ...config.rules }), {}),
            'quotes': ['error', 'single'],
            'no-trailing-spaces': ['error'],
            'object-curly-spacing': ['error', 'always'],
            'comma-dangle': ['error', 'always-multiline'],
            'semi': ['error', 'never'],
            '@typescript-eslint/no-non-null-assertion': ['off'],
            '@typescript-eslint/ban-ts-comment': ['off'],
            '@typescript-eslint/no-explicit-any': ['off'],
            '@stylistic/no-extra-semi': ['error'],
            '@stylistic/arrow-parens': ['error'],
            '@stylistic/space-infix-ops': ['error'],
            '@stylistic/indent': ['error', 4],
        },
    },
]
