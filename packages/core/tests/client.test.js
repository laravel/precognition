import { it, vi, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { client } from '../src/index'

beforeEach(() => {
    vi.mock('axios')
    client.use(axios)
    vi.useFakeTimers()
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.runAllTimers()
})

it('can handle a successful precognition response via config handler', async () => {
    expect.assertions(2)

    const response = { headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' }
    axios.request.mockResolvedValueOnce(response)

    await client.get('https://laravel.com', {}, {
        onPrecognitionSuccess: (r) => {
            expect(r).toBe(response)

            return 'expected value'
        },
    }).then(value => expect(value).toBe('expected value'))
})

it('can handle a success response via a fulfilled promise', async () => {
    expect.assertions(1)

    const response = { headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' }
    axios.request.mockResolvedValueOnce(response)

    await client.post('https://laravel.com').then(r => expect(r).toBe(response))
})

it('can handle a validation response via a config handler', async () => {
    expect.assertions(3)

    const error = {
        response: {
            headers: { precognition: 'true' },
            status: 422,
            data: {
                message: 'expected message',
                errors: { name: ['expected error'] },
            },
        },
    }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(true)

    await client.patch('https://laravel.com', {}, {
        onValidationError: (p, e) => {
            expect(p).toBe(error.response)
            expect(e).toBe(error)

            return 'expected value'
        },
    }).then(value => expect(value).toBe('expected value'))
})

it('can handle an unauthorized response via a config handler', async () => {
    expect.assertions(3)

    const error = {
        response: {
            headers: { precognition: 'true' },
            status: 401,
            data: 'expected data',
        },
    }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(true)

    await client.delete('https://laravel.com', {}, {
        onUnauthorized: (p, e) => {
            expect(p).toBe(error.response)
            expect(e).toBe(error)

            return 'expected value'
        },
    }).then(value => expect(value).toBe('expected value'))
})

it('can handle a forbidden response via a config handler', async () => {
    expect.assertions(3)

    const error = {
        response: {
            headers: { precognition: 'true' },
            status: 403,
            data: 'expected data',
        },
    }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(true)

    await client.put('https://laravel.com', {}, {
        onForbidden: (p, e) => {
            expect(p).toBe(error.response)
            expect(e).toBe(error)

            return 'expected value'
        },
    }).then(value => expect(value).toBe('expected value'))
})

it('can handle a not found response via a config handler', async () => {
    expect.assertions(3)

    const error = {
        response: {
            headers: { precognition: 'true' },
            status: 404,
            data: 'data',
        },
    }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(true)

    await client.get('https://laravel.com', {}, {
        onNotFound: (p, e) => {
            expect(p).toBe(error.response)
            expect(e).toBe(error)

            return 'expected value'
        },
    }).then(value => expect(value).toBe('expected value'))
})

it('can handle a conflict response via a config handler', async () => {
    expect.assertions(3)

    const error = {
        response: {
            headers: { precognition: 'true' },
            status: 409,
            data: 'expected data',
        },
    }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(true)

    await client.get('https://laravel.com', {}, {
        onConflict: (p, e) => {
            expect(p).toBe(error.response)
            expect(e).toBe(error)

            return 'expected value'
        },
    }).then(value => expect(value).toBe('expected value'))
})

it('can handle a locked response via a config handler', async () => {
    expect.assertions(3)

    const error = {
        response: {
            headers: { precognition: 'true' },
            status: 423,
            data: 'expected data',
        },
    }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(true)

    await client.get('https://laravel.com', {}, {
        onLocked: (p, e) => {
            expect(p).toBe(error.response)
            expect(e).toBe(error)

            return 'expected value'
        },
    }).then(value => expect(value).toBe('expected value'))
})

it('can provide input names to validate via config', async () => {
    expect.assertions(1)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await client.get('https://laravel.com', {}, {
        validate: ['username', 'email'],
    })

    expect(config.headers['Precognition-Validate-Only']).toBe('username,email')
})

it('throws an error if the precognition header is not present on a success response', async () => {
    expect.assertions(2)

    axios.request.mockResolvedValueOnce({ headers: {}, status: 204 })

    await client.get('https://laravel.com').catch((e) => {
        expect(e).toBeInstanceOf(Error)
        expect(e.message).toBe('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.')
    })
})

it('does not consider 204 response to be success without "Precognition-Success" header', async () => {
    expect.assertions(2)

    axios.request.mockResolvedValueOnce({ headers: { precognition: 'true' }, status: 204 })
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

    axios.request.mockRejectedValueOnce({ response: { status: 500 } })
    axios.isAxiosError.mockReturnValueOnce(true)

    await client.get('https://laravel.com').catch((e) => {
        expect(e).toBeInstanceOf(Error)
        expect(e.message).toBe('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.')
    })
})

it('returns a non-axios error via a rejected promise', async () => {
    expect.assertions(1)

    const error = { expected: 'error' }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(false)

    await client.get('https://laravel.com').catch((e) => {
        expect(e).toBe(error)
    })
})

it('returns a cancelled request error va rejected promise', async () => {
    expect.assertions(1)

    const error = { expected: 'error' }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(true)
    axios.isCancel.mockReturnValueOnce(true)

    await client.get('https://laravel.com').catch((e) => {
        expect(e).toBe(error)
    })
})

it('an axerror without a "status" property returns a rejected promise', async () => {
    expect.assertions(1)

    const error = { expected: 'error' }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(true)

    await client.get('https://laravel.com').catch((e) => {
        expect(e).toBe(error)
    })
})

it('can handle error responses via a rejected promise', async () => {
    expect.assertions(1)

    const error = {
        response: {
            headers: { precognition: 'true' },
            status: 422,
            data: {
                message: 'expected message',
                errors: { name: ['expected error'] },
            },
        },
    }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(true)

    await client.get('https://laravel.com').catch(e => expect(e).toBe(error))
})

it('can customize how it determines a successful precognition response', async () => {
    expect.assertions(3)

    let response = { headers: { precognition: 'true' }, status: 999, data: 'data' }
    axios.request.mockResolvedValueOnce(response)

    client.determineSuccessUsing((response) => response.status === 999)

    await client.get('https://laravel.com', {}, {
        onPrecognitionSuccess: (r) => {
            expect(r).toBe(response)

            return 'expected value'
        },
    }).then(value => expect(value).toBe('expected value'))

    response = { headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' }
    axios.request.mockResolvedValueOnce(response)

    await client.get('https://laravel.com', {}, {
        onPrecognitionSuccess: () => {
            return 'xxxx'
        },
    }).then(value => expect(value).toBe(response))
})

it('creates a request fingerprint and an abort signal if none are configured', async () => {
    expect.assertions(2)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await client.get('https://laravel.com')

    expect(config.fingerprint).toBe('get:https://laravel.com')
    expect(config.signal).toBeInstanceOf(AbortSignal)
})

it('uses the default axios baseURL in the request fingerprint', async () => {
    expect.assertions(2)

    let config
    axios.defaults.baseURL = 'https://laravel.com'
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await client.get('/docs')

    expect(config.fingerprint).toBe('get:https://laravel.com/docs')
    expect(config.signal).toBeInstanceOf(AbortSignal)
})

it('the confbaseURL takes precedence over the axios default baseURL for request id', async () => {
    expect.assertions(2)

    let config
    axios.defaults.baseURL = 'https://laravel.com'
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await client.get('/docs', {}, {
        baseURL: 'https://forge.laravel.com',
    })

    expect(config.fingerprint).toBe('get:https://forge.laravel.com/docs')
    expect(config.signal).toBeInstanceOf(AbortSignal)
})

it('can specify the request fingerprint via config', async () => {
    expect.assertions(2)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await client.get('/docs', {}, {
        fingerprint: 'expected-id',
    })

    expect(config.fingerprint).toBe('expected-id')
    expect(config.signal).toBeInstanceOf(AbortSignal)
})

it('can customize how the request fingerprint is created', async () => {
    expect.assertions(2)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })
    client.fingerprintRequestsUsing(() => 'expected-id')

    await client.get('/docs')

    expect(config.fingerprint).toBe('expected-id')
    expect(config.signal).toBeInstanceOf(AbortSignal)
})

it('the conffingerprint takes precedence over the global fingerprint for request id', async () => {
    expect.assertions(2)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })
    client.fingerprintRequestsUsing(() => 'foo')

    await client.get('/docs', {}, {
        fingerprint: 'expected-id',
    })

    expect(config.fingerprint).toBe('expected-id')
    expect(config.signal).toBeInstanceOf(AbortSignal)
})

it('can opt out of automatic request aborting', async () => {
    expect.assertions(2)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await client.get('/docs', {}, {
        fingerprint: null,
    })

    expect(config.fingerprint).toBe(null)
    expect(config.signal).toBeUndefined()
})

it('can specify the abort controller via config', async () => {
    expect.assertions(1)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
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

it('does not create an abort controller when a cancelToken is provided', async () => {
    expect.assertions(1)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await client.get('/docs', {}, {
        cancelToken: { /* ... */ },
    })

    expect(config.signal).toBeUndefined()
})

it('overrides request method url with config url', async () => {
    expect.assertions(5)

    let config
    axios.request.mockImplementation((c) => {
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
    axios.request.mockImplementation((c) => {
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
    axios.request.mockImplementation((c) => {
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
    axios.request.mockImplementation((c) => {
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
