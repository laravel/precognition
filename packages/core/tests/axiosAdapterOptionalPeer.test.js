import { it, vi, expect } from 'vitest'
import { axiosAdapter } from '../src/http/axiosAdapter'

// Mirror the stub Vite substitutes for a missing optional peer dependency,
// which only provides a default export.
vi.mock('axios', () => ({
    default: {
        isAxiosError: () => false,
        isCancel: () => false,
        request: vi.fn(),
    },
}))

it('only depends on the default export of axios', async () => {
    const instance = {
        request: vi.fn().mockRejectedValueOnce(new Error('Request failed')),
        defaults: {},
    }

    const adapter = axiosAdapter(instance)

    expect(adapter.getAxiosInstance()).toBe(instance)
    await expect(adapter.request({ method: 'get', url: '/test' })).rejects.toThrow('Request failed')
})
