import { it, vi, expect, beforeEach, afterEach } from 'vitest'
import { client } from '../src/index'
import { HttpResponseError } from '../src/http/errors'

/**
 * Create a mock HTTP client for testing.
 */
const createMockHttpClient = () => {
    const mockRequest = vi.fn()

    return {
        request: mockRequest,
        mockResolvedValueOnce: (response) => {
            mockRequest.mockResolvedValueOnce(response)
        },
        mockRejectedValueOnce: (error) => {
            mockRequest.mockRejectedValueOnce(error)
        },
        mockImplementation: (fn) => {
            mockRequest.mockImplementation(fn)
        },
        mockImplementationOnce: (fn) => {
            mockRequest.mockImplementationOnce(fn)
        },
        getLastConfig: () => mockRequest.mock.calls[mockRequest.mock.calls.length - 1]?.[0],
    }
}

let mockClient

beforeEach(() => {
    mockClient = createMockHttpClient()
    client.useHttpClient(mockClient)
    vi.useFakeTimers()
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.runAllTimers()
})

it('can handle a successful precognition response via config handler', async () => {
    expect.assertions(2)

    const response = { headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' }
    mockClient.mockResolvedValueOnce(response)

    await client.get('https://laravel.com', {}, {
        onPrecognitionSuccess: (r) => {
            expect(r).toBe(response)

            return 'expected value'
        },
    }).then((value) => expect(value).toBe('expected value'))
})

it('can handle a success response via a fulfilled promise', async () => {
    expect.assertions(1)

    const response = { headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' }
    mockClient.mockResolvedValueOnce(response)

    await client.post('https://laravel.com').then((r) => expect(r).toBe(response))
})

it('can handle a validation response via a config handler', async () => {
    expect.assertions(3)

    const errorResponse = {
        headers: { precognition: 'true' },
        status: 422,
        data: {
            message: 'expected message',
            errors: { name: ['expected error'] },
        },
    }
    mockClient.mockRejectedValueOnce(new HttpResponseError(errorResponse))

    await client.patch('https://laravel.com', {}, {
        onValidationError: (p, e) => {
            expect(p).toEqual(errorResponse)
            expect(e).toBeInstanceOf(HttpResponseError)

            return 'expected value'
        },
    }).then((value) => expect(value).toBe('expected value'))
})

it('can handle an unauthorized response via a config handler', async () => {
    expect.assertions(3)

    const errorResponse = {
        headers: { precognition: 'true' },
        status: 401,
        data: 'expected data',
    }
    mockClient.mockRejectedValueOnce(new HttpResponseError(errorResponse))

    await client.delete('https://laravel.com', {}, {
        onUnauthorized: (p, e) => {
            expect(p).toEqual(errorResponse)
            expect(e).toBeInstanceOf(HttpResponseError)

            return 'expected value'
        },
    }).then((value) => expect(value).toBe('expected value'))
})

it('can handle a forbidden response via a config handler', async () => {
    expect.assertions(3)

    const errorResponse = {
        headers: { precognition: 'true' },
        status: 403,
        data: 'expected data',
    }
    mockClient.mockRejectedValueOnce(new HttpResponseError(errorResponse))

    await client.put('https://laravel.com', {}, {
        onForbidden: (p, e) => {
            expect(p).toEqual(errorResponse)
            expect(e).toBeInstanceOf(HttpResponseError)

            return 'expected value'
        },
    }).then((value) => expect(value).toBe('expected value'))
})

it('can handle a not found response via a config handler', async () => {
    expect.assertions(3)

    const errorResponse = {
        headers: { precognition: 'true' },
        status: 404,
        data: 'data',
    }
    mockClient.mockRejectedValueOnce(new HttpResponseError(errorResponse))

    await client.get('https://laravel.com', {}, {
        onNotFound: (p, e) => {
            expect(p).toEqual(errorResponse)
            expect(e).toBeInstanceOf(HttpResponseError)

            return 'expected value'
        },
    }).then((value) => expect(value).toBe('expected value'))
})

it('can handle a conflict response via a config handler', async () => {
    expect.assertions(3)

    const errorResponse = {
        headers: { precognition: 'true' },
        status: 409,
        data: 'expected data',
    }
    mockClient.mockRejectedValueOnce(new HttpResponseError(errorResponse))

    await client.get('https://laravel.com', {}, {
        onConflict: (p, e) => {
            expect(p).toEqual(errorResponse)
            expect(e).toBeInstanceOf(HttpResponseError)

            return 'expected value'
        },
    }).then((value) => expect(value).toBe('expected value'))
})

it('can handle a locked response via a config handler', async () => {
    expect.assertions(3)

    const errorResponse = {
        headers: { precognition: 'true' },
        status: 423,
        data: 'expected data',
    }
    mockClient.mockRejectedValueOnce(new HttpResponseError(errorResponse))

    await client.get('https://laravel.com', {}, {
        onLocked: (p, e) => {
            expect(p).toEqual(errorResponse)
            expect(e).toBeInstanceOf(HttpResponseError)

            return 'expected value'
        },
    }).then((value) => expect(value).toBe('expected value'))
})

it('can provide input names to validate via config', async () => {
    expect.assertions(1)

    let config
    mockClient.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' }, status: 200, data: {} })
    })

    await client.get('https://laravel.com', {}, {
        only: ['username', 'email'],
    })

    expect(config.headers['Precognition-Validate-Only']).toBe('username,email')
})

it('continues to support the deprecated "validate" key as fallback of "only"', async () => {
    expect.assertions(1)

    let config
    mockClient.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' }, status: 200, data: {} })
    })

    await client.get('https://laravel.com', {}, {
        validate: ['username', 'email'],
    })

    expect(config.headers['Precognition-Validate-Only']).toBe('username,email')
})

it('throws an error if the precognition header is not present on a success response', async () => {
    expect.assertions(2)

    mockClient.mockResolvedValueOnce({ headers: {}, status: 204, data: {} })

    await client.get('https://laravel.com').catch((e) => {
        expect(e).toBeInstanceOf(Error)
        expect(e.message).toBe('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.')
    })
})

it('does not consider 204 response to be success without "Precognition-Success" header', async () => {
    expect.assertions(2)

    mockClient.mockResolvedValueOnce({ headers: { precognition: 'true' }, status: 204, data: {} })
    let precognitionSucess = false
    let responseSuccess = false

    await client.get('https://laravel.com', {}, {
        onPrecognitionSuccess() {
            precognitionSucess = true
        },
        onSuccess() {
            responseSuccess = true
        },
    })

    expect(precognitionSucess).toBe(false)
    expect(responseSuccess).toBe(true)
})

it('throws an error if the precognition header is not present on an error response', async () => {
    expect.assertions(2)

    mockClient.mockRejectedValueOnce(new HttpResponseError({ status: 500, headers: {}, data: {} }))

    await client.get('https://laravel.com').catch((e) => {
        expect(e).toBeInstanceOf(Error)
        expect(e.message).toBe('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.')
    })
})

it('returns a non-http-response error via a rejected promise', async () => {
    expect.assertions(1)

    const error = new Error('expected error')
    mockClient.mockRejectedValueOnce(error)

    await client.get('https://laravel.com').catch((e) => {
        expect(e).toBe(error)
    })
})

it('can handle error responses via a rejected promise', async () => {
    expect.assertions(1)

    const errorResponse = {
        headers: { precognition: 'true' },
        status: 422,
        data: {
            message: 'expected message',
            errors: { name: ['expected error'] },
        },
    }
    const error = new HttpResponseError(errorResponse)
    mockClient.mockRejectedValueOnce(error)

    await client.get('https://laravel.com').catch((e) => expect(e).toBe(error))
})

it('can customize how it determines a successful precognition response', async () => {
    expect.assertions(3)

    let response = { headers: { precognition: 'true' }, status: 999, data: 'data' }
    mockClient.mockResolvedValueOnce(response)

    client.determineSuccessUsing((response) => response.status === 999)

    await client.get('https://laravel.com', {}, {
        onPrecognitionSuccess: (r) => {
            expect(r).toBe(response)

            return 'expected value'
        },
    }).then((value) => expect(value).toBe('expected value'))

    response = { headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' }
    mockClient.mockResolvedValueOnce(response)

    await client.get('https://laravel.com', {}, {
        onPrecognitionSuccess: () => {
            return 'xxxx'
        },
    }).then((value) => expect(value).toBe(response))
})

it('creates a request fingerprint and an abort signal if none are configured', async () => {
    expect.assertions(2)

    mockClient.mockImplementationOnce(() => {
        return Promise.resolve({ headers: { precognition: 'true' }, status: 200, data: {} })
    })

    await client.get('https://laravel.com')

    expect(mockClient.getLastConfig().url).toBe('https://laravel.com')
    expect(mockClient.getLastConfig().signal).toBeInstanceOf(AbortSignal)
})

it('can set and use base URL', async () => {
    expect.assertions(2)

    let config
    mockClient.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' }, status: 200, data: {} })
    })

    client.setBaseURL('https://laravel.com')

    await client.get('/docs')

    expect(config.url).toBe('/docs')
    expect(config.baseURL).toBe('https://laravel.com')

    // Reset base URL
    client.setBaseURL(undefined)
})

it('the config baseURL takes precedence over the global baseURL', async () => {
    expect.assertions(2)

    let config
    mockClient.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' }, status: 200, data: {} })
    })

    client.setBaseURL('https://laravel.com')

    await client.get('/docs', {}, {
        baseURL: 'https://forge.laravel.com',
    })

    expect(config.url).toBe('/docs')
    expect(config.baseURL).toBe('https://forge.laravel.com')

    // Reset base URL
    client.setBaseURL(undefined)
})

it('can specify the abort controller via config', async () => {
    expect.assertions(1)

    let config
    mockClient.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' }, status: 200, data: {} })
    })
    let called = false
    const controller = new AbortController
    controller.signal.addEventListener('foo', () => {
        called = true
    })

    await client.get('/docs', {}, {
        signal: controller.signal,
    })
    config.signal.dispatchEvent(new Event('foo'))

    expect(called).toBe(true)
})

it('overrides request method url with config url', async () => {
    expect.assertions(5)

    let config
    mockClient.mockImplementation((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' })
    })

    await client.get('https://laravel.com', {}, {
        url: 'https://forge.laravel.com',
    })
    expect(config.url).toBe('https://forge.laravel.com')

    await client.post('https://laravel.com', {}, {
        url: 'https://forge.laravel.com',
    })
    expect(config.url).toBe('https://forge.laravel.com')

    await client.patch('https://laravel.com', {}, {
        url: 'https://forge.laravel.com',
    })
    expect(config.url).toBe('https://forge.laravel.com')

    await client.put('https://laravel.com', {}, {
        url: 'https://forge.laravel.com',
    })
    expect(config.url).toBe('https://forge.laravel.com')

    await client.delete('https://laravel.com', {}, {
        url: 'https://forge.laravel.com',
    })
    expect(config.url).toBe('https://forge.laravel.com')
})

it('overrides the request data with the config data', async () => {
    expect.assertions(5)

    let config
    mockClient.mockImplementation((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' })
    })

    await client.get('https://laravel.com', { expected: false }, {
        data: { expected: true },
    })
    expect(config.data).toEqual({ expected: true })

    await client.post('https://laravel.com', { expected: false }, {
        data: { expected: true },
    })
    expect(config.data).toEqual({ expected: true })

    await client.patch('https://laravel.com', { expected: false }, {
        data: { expected: true },
    })
    expect(config.data).toEqual({ expected: true })

    await client.put('https://laravel.com', { expected: false }, {
        data: { expected: true },
    })
    expect(config.data).toEqual({ expected: true })

    await client.delete('https://laravel.com', { expected: false }, {
        data: { expected: true },
    })
    expect(config.data).toEqual({ expected: true })
})

it('merges request data with config data', async () => {
    expect.assertions(7)

    let config
    mockClient.mockImplementation((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' })
    })

    await client.get('https://laravel.com', { request: true }, {
        data: { config: true },
    })
    expect(config.data).toEqual({ config: true })
    expect(config.params).toEqual({ request: true })

    await client.post('https://laravel.com', { request: true }, {
        data: { config: true },
    })
    expect(config.data).toEqual({ request: true, config: true })

    await client.patch('https://laravel.com', { request: true }, {
        data: { config: true },
    })
    expect(config.data).toEqual({ request: true, config: true })

    await client.put('https://laravel.com', { request: true }, {
        data: { config: true },
    })
    expect(config.data).toEqual({ request: true, config: true })

    await client.delete('https://laravel.com', { request: true }, {
        data: { config: true },
    })
    expect(config.data).toEqual({ config: true })
    expect(config.params).toEqual({ request: true })
})

it('merges request data with config params for get and delete requests', async () => {
    expect.assertions(4)

    let config
    mockClient.mockImplementation((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' })
    })

    await client.get('https://laravel.com', { data: true }, {
        params: { param: true },
    })
    expect(config.params).toEqual({ data: true, param: true })
    expect(config.data).toBeUndefined()

    await client.delete('https://laravel.com', { data: true }, {
        params: { param: true },
    })
    expect(config.params).toEqual({ data: true, param: true })
    expect(config.data).toBeUndefined()
})

it('can get and set base URL', () => {
    client.setBaseURL('https://example.com')
    expect(client.getBaseURL()).toBe('https://example.com')

    client.setBaseURL(undefined)
    expect(client.getBaseURL()).toBeUndefined()
})
