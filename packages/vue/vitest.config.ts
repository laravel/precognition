import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        typecheck: {
            enabled: true,
            tsconfig: './tsconfig.test.json',
            include: ['tests/**/*.test-d.ts'],
        },
    },
})
