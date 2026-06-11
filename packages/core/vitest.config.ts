import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        typecheck: {
            enabled: true,
            include: ['**/*.test-d.ts'],
            tsconfig: './tsconfig.vitest.json',
        },
    },
})
