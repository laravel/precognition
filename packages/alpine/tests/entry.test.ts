import { expect, it, vi } from 'vitest'

vi.mock('axios', () => {
    throw new Error('The main entry must not import the optional axios peer dependency.')
})

it('loads the main entry without axios', async () => {
    await expect(import('../src/index.js')).resolves.toHaveProperty('default')
})

it('exports the axios adapter from the axios entry', async () => {
    vi.doUnmock('axios')
    vi.resetModules()

    await expect(import('../src/axios.js')).resolves.toHaveProperty('axiosAdapter')
})
