import { it, vi, expect, beforeEach, afterEach, describe } from 'vitest'
import axios from 'axios'
import { axiosAdapter } from '../src/http/axiosAdapter'
import { HttpResponseError, HttpCancelledError, HttpNetworkError } from '../src/http/errors'

describe('axiosAdapter', () => {
    let mockAxios

    beforeEach(() => {
        mockAxios = {
            request: vi.fn(),
            defaults: {},
        }
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('creates an adapter with the provided axios instance', () => {
        const adapter = axiosAdapter(mockAxios)

        expect(adapter).toBeDefined()
        expect(typeof adapter.request).toBe('function')
        expect(adapter.getAxiosInstance()).toBe(mockAxios)
    })

    it('makes a successful GET request', async () => {
        mockAxios.request.mockResolvedValueOnce({
            status: 200,
            data: { users: [] },
            headers: { 'content-type': 'application/json' },
        })

        const adapter = axiosAdapter(mockAxios)
        const response = await adapter.request({
            method: 'get',
            url: '/api/users',
        })

        expect(response.status).toBe(200)
        expect(response.data).toEqual({ users: [] })
        expect(mockAxios.request).toHaveBeenCalledWith(expect.objectContaining({
            method: 'get',
            url: '/api/users',
        }))
    })

    it('makes a POST request with data', async () => {
        mockAxios.request.mockResolvedValueOnce({
            status: 201,
            data: { id: 1 },
            headers: {},
        })

        const adapter = axiosAdapter(mockAxios)
        await adapter.request({
            method: 'post',
            url: '/api/users',
            data: { name: 'John' },
        })

        expect(mockAxios.request).toHaveBeenCalledWith(expect.objectContaining({
            method: 'post',
            url: '/api/users',
            data: { name: 'John' },
        }))
    })

    it('passes all config options to axios', async () => {
        mockAxios.request.mockResolvedValueOnce({
            status: 200,
            data: {},
            headers: {},
        })

        const signal = new AbortController().signal
        const adapter = axiosAdapter(mockAxios)

        await adapter.request({
            method: 'get',
            url: '/api/users',
            baseURL: 'https://laravel.com',
            params: { page: 1 },
            headers: { Authorization: 'Bearer token' },
            signal,
            timeout: 5000,
        })

        expect(mockAxios.request).toHaveBeenCalledWith({
            method: 'get',
            url: '/api/users',
            baseURL: 'https://laravel.com',
            data: undefined,
            params: { page: 1 },
            headers: { Authorization: 'Bearer token' },
            signal,
            timeout: 5000,
        })
    })

    it('normalizes response headers to lowercase', async () => {
        mockAxios.request.mockResolvedValueOnce({
            status: 200,
            data: {},
            headers: {
                'Content-Type': 'application/json',
                'X-Custom-Header': 'value',
            },
        })

        const adapter = axiosAdapter(mockAxios)
        const response = await adapter.request({
            method: 'get',
            url: '/api/users',
        })

        expect(response.headers['content-type']).toBe('application/json')
        expect(response.headers['x-custom-header']).toBe('value')
    })

    it('exposes the axios instance via getAxiosInstance', () => {
        const adapter = axiosAdapter(mockAxios)

        expect(adapter.getAxiosInstance()).toBe(mockAxios)
    })
})

describe('axiosAdapter with real axios', () => {
    it('creates an adapter using default axios when no instance provided', () => {
        const adapter = axiosAdapter()

        expect(adapter).toBeDefined()
        expect(typeof adapter.request).toBe('function')
        expect(adapter.getAxiosInstance()).toBe(axios)
    })

    it('throws HttpResponseError for error responses', async () => {
        const instance = axios.create()

        // Mock the request method to throw an axios error
        const axiosError = new Error('Request failed')
        axiosError.isAxiosError = true
        axiosError.response = {
            status: 422,
            data: { errors: { name: ['Required'] } },
            headers: { 'content-type': 'application/json' },
        }

        vi.spyOn(instance, 'request').mockRejectedValueOnce(axiosError)

        const adapter = axiosAdapter(instance)

        try {
            await adapter.request({
                method: 'post',
                url: '/api/users',
                data: {},
            })
            expect.fail('Should have thrown')
        } catch (error) {
            expect(error).toBeInstanceOf(HttpResponseError)
            expect(error.response.status).toBe(422)
        }
    })

    it('throws HttpCancelledError for cancelled requests', async () => {
        const instance = axios.create()
        const controller = new AbortController()

        // Create a cancelled error using axios.CancelToken (legacy) behavior
        const cancelError = new axios.Cancel('Request cancelled')

        vi.spyOn(instance, 'request').mockRejectedValueOnce(cancelError)

        const adapter = axiosAdapter(instance)

        await expect(adapter.request({
            method: 'get',
            url: '/api/users',
            signal: controller.signal,
        })).rejects.toThrow(HttpCancelledError)
    })

    it('throws HttpNetworkError for network errors', async () => {
        const instance = axios.create()

        const networkError = new Error('Network Error')

        vi.spyOn(instance, 'request').mockRejectedValueOnce(networkError)

        const adapter = axiosAdapter(instance)

        await expect(adapter.request({
            method: 'get',
            url: '/api/users',
        })).rejects.toThrow(HttpNetworkError)
    })
})
