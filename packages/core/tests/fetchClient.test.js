import { it, vi, expect, beforeEach, afterEach, describe } from 'vitest'
import { createFetchClient, fetchHttpClient } from '../src/http/fetchClient'
import { HttpResponseError, HttpCancelledError, HttpNetworkError } from '../src/http/errors'

describe('fetchClient', () => {
    let originalFetch

    beforeEach(() => {
        originalFetch = global.fetch
    })

    afterEach(() => {
        global.fetch = originalFetch
        vi.restoreAllMocks()
    })

    it('exports a default fetchHttpClient instance', () => {
        expect(fetchHttpClient).toBeDefined()
        expect(typeof fetchHttpClient.request).toBe('function')
    })

    it('can create a custom fetch client with options', () => {
        const client = createFetchClient({ baseURL: 'https://laravel.com' })
        expect(client).toBeDefined()
        expect(typeof client.request).toBe('function')
    })

    it('makes a successful GET request', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({ data: 'test' }),
        })

        const response = await fetchHttpClient.request({
            method: 'get',
            url: 'https://laravel.com/api/users',
        })

        expect(response.status).toBe(200)
        expect(response.data).toEqual({ data: 'test' })
        expect(global.fetch).toHaveBeenCalledWith(
            'https://laravel.com/api/users',
            expect.objectContaining({ method: 'GET' }),
        )
    })

    it('makes a POST request with JSON data', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({ id: 1 }),
        })

        const response = await fetchHttpClient.request({
            method: 'post',
            url: 'https://laravel.com/api/users',
            data: { name: 'John' },
        })

        expect(response.status).toBe(201)
        expect(global.fetch).toHaveBeenCalledWith(
            'https://laravel.com/api/users',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ name: 'John' }),
            }),
        )
    })

    it('builds URL with base URL', async () => {
        const client = createFetchClient({ baseURL: 'https://laravel.com' })

        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({}),
        })

        await client.request({
            method: 'get',
            url: '/api/users',
        })

        expect(global.fetch).toHaveBeenCalledWith(
            'https://laravel.com/api/users',
            expect.any(Object),
        )
    })

    it('config baseURL takes precedence over client baseURL', async () => {
        const client = createFetchClient({ baseURL: 'https://laravel.com' })

        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({}),
        })

        await client.request({
            method: 'get',
            url: '/api/users',
            baseURL: 'https://forge.laravel.com',
        })

        expect(global.fetch).toHaveBeenCalledWith(
            'https://forge.laravel.com/api/users',
            expect.any(Object),
        )
    })

    it('builds query string from params', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({}),
        })

        await fetchHttpClient.request({
            method: 'get',
            url: 'https://laravel.com/api/users',
            params: { page: 1, limit: 10 },
        })

        expect(global.fetch).toHaveBeenCalledWith(
            'https://laravel.com/api/users?page=1&limit=10',
            expect.any(Object),
        )
    })

    it('builds query string with array params', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({}),
        })

        await fetchHttpClient.request({
            method: 'get',
            url: 'https://laravel.com/api/users',
            params: { ids: [1, 2, 3] },
        })

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('ids%5B%5D=1'),
            expect.any(Object),
        )
    })

    it('throws HttpResponseError for 4xx responses', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: false,
            status: 422,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({ errors: { name: ['Required'] } }),
        })

        await expect(fetchHttpClient.request({
            method: 'post',
            url: 'https://laravel.com/api/users',
            data: {},
        })).rejects.toThrow(HttpResponseError)
    })

    it('throws HttpResponseError for 5xx responses', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: false,
            status: 500,
            headers: new Headers({ 'content-type': 'text/plain' }),
            text: () => Promise.resolve('Server Error'),
        })

        await expect(fetchHttpClient.request({
            method: 'get',
            url: 'https://laravel.com/api/users',
        })).rejects.toThrow(HttpResponseError)
    })

    it('throws HttpCancelledError when request is aborted', async () => {
        const controller = new AbortController()

        global.fetch = vi.fn().mockImplementationOnce(() => {
            controller.abort()
            const error = new DOMException('Aborted', 'AbortError')
            return Promise.reject(error)
        })

        await expect(fetchHttpClient.request({
            method: 'get',
            url: 'https://laravel.com/api/users',
            signal: controller.signal,
        })).rejects.toThrow(HttpCancelledError)
    })

    it('throws HttpNetworkError for network failures', async () => {
        global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'))

        await expect(fetchHttpClient.request({
            method: 'get',
            url: 'https://laravel.com/api/users',
        })).rejects.toThrow(HttpNetworkError)
    })

    it('parses text responses when content-type is not JSON', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'text/html' }),
            text: () => Promise.resolve('<html></html>'),
        })

        const response = await fetchHttpClient.request({
            method: 'get',
            url: 'https://laravel.com',
        })

        expect(response.data).toBe('<html></html>')
    })

    it('normalizes response headers to lowercase', async () => {
        const headers = new Headers()
        headers.set('Content-Type', 'application/json')
        headers.set('X-Custom-Header', 'value')

        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers,
            json: () => Promise.resolve({}),
        })

        const response = await fetchHttpClient.request({
            method: 'get',
            url: 'https://laravel.com/api/users',
        })

        expect(response.headers['content-type']).toBe('application/json')
        expect(response.headers['x-custom-header']).toBe('value')
    })

    it('sets Content-Type to application/json for POST requests with data', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({}),
        })

        await fetchHttpClient.request({
            method: 'post',
            url: 'https://laravel.com/api/users',
            data: { name: 'John' },
        })

        expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                }),
            }),
        )
    })

    it('does not set Content-Type for GET requests', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({}),
        })

        await fetchHttpClient.request({
            method: 'get',
            url: 'https://laravel.com/api/users',
        })

        const callArgs = global.fetch.mock.calls[0][1]
        expect(callArgs.headers['Content-Type']).toBeUndefined()
    })

    it('passes custom headers', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({}),
        })

        await fetchHttpClient.request({
            method: 'get',
            url: 'https://laravel.com/api/users',
            headers: {
                'Authorization': 'Bearer token',
                'X-Custom': 'value',
            },
        })

        expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': 'Bearer token',
                    'X-Custom': 'value',
                }),
            }),
        )
    })

    it('uses same-origin credentials', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({}),
        })

        await fetchHttpClient.request({
            method: 'get',
            url: 'https://laravel.com/api/users',
        })

        expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                credentials: 'same-origin',
            }),
        )
    })

    it('does not set Content-Type for FormData uploads', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({}),
        })

        const formData = new FormData()
        formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt')

        await fetchHttpClient.request({
            method: 'post',
            url: 'https://laravel.com/api/upload',
            data: formData,
        })

        const callArgs = global.fetch.mock.calls[0][1]
        expect(callArgs.headers['Content-Type']).toBeUndefined()
        expect(callArgs.body).toBeInstanceOf(FormData)
    })

    it('does not set Content-Type when data contains files', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({}),
        })

        await fetchHttpClient.request({
            method: 'post',
            url: 'https://laravel.com/api/upload',
            data: {
                name: 'test',
                file: new Blob(['test'], { type: 'text/plain' }),
            },
        })

        const callArgs = global.fetch.mock.calls[0][1]
        expect(callArgs.headers['Content-Type']).toBeUndefined()
        expect(callArgs.body).toBeInstanceOf(FormData)
    })

    it('inherits X-Requested-With from Laravel bootstrap config', async () => {
        global.window = {
            axios: {
                defaults: {
                    headers: {
                        common: {
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    },
                },
            },
        }

        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({}),
        })

        const client = createFetchClient()

        await client.request({
            method: 'get',
            url: 'https://laravel.com/api/users',
        })

        expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'X-Requested-With': 'XMLHttpRequest',
                }),
            }),
        )

        delete global.window
    })
})
