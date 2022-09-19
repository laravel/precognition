import axios from 'axios'
import precognition, { client, poll } from '../src/index'

jest.mock('axios')
precognition.use(axios)
jest.useFakeTimers()
jest.spyOn(global, 'setTimeout')

test('success response must have Precognition header', async () => {
    expect.assertions(2)

    axios.request.mockResolvedValueOnce({ headers: {} })

    await precognition.get('https://laravel.com').catch((e) => {
        expect(e).toBeInstanceOf(Error)
        expect(e.message).toBe('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.')
    })
})

test('error response must have Precognition header', async () => {
    expect.assertions(2)

    axios.request.mockRejectedValueOnce({ response: { status: 500 } })
    axios.isAxiosError.mockReturnValue(true)

    await precognition.get('https://laravel.com').catch((e) => {
        expect(e).toBeInstanceOf(Error)
        expect(e.message).toBe('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.')
    })
})

test('unknown error is rejected again', async () => {
    expect.assertions(1)

    const error = { expected: 'error' }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(false)

    await precognition.get('https://laravel.com').catch((e) => {
        expect(e).toBe(error)
    })
})

test('test canceled request is rejected again', async () => {
    expect.assertions(1)

    const error = { expected: 'error' }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(true)
    axios.isCancel.mockReturnValueOnce(true)

    await precognition.get('https://laravel.com').catch((e) => {
        expect(e).toBe(error)
    })
})

test('axios error without status is rejected', async () => {
    expect.assertions(1)

    const error = { expected: 'error' }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(true)

    await precognition.get('https://laravel.com').catch((e) => {
        expect(e).toBe(error)
    })
})

test('it does not have to provide a success handler', async () => {
    expect.assertions(1)

    const response = { headers: { precognition: 'true' }, status: 204, data: 'expected data' }
    axios.request.mockResolvedValueOnce(response)

    await precognition.get('https://laravel.com').then(r => expect(r).toBe(response))
})

test('it can provide a onPrecognitionSuccess handler', async () => {
    expect.assertions(3)

    const response = { headers: { precognition: 'true' }, status: 204, data: 'expected data' }
    axios.request.mockResolvedValueOnce(response)

    await precognition.get('https://laravel.com', {
        onPrecognitionSuccess: (r, e) => {
            expect(r).toBe(response)
            expect(e).toBeUndefined()

            return 'expected return'
        },
    }).then(value => expect(value).toBe('expected return'))
})

test('it does not have to provide an error handler', async () => {
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

    await precognition.get('https://laravel.com').catch(e => expect(e).toBe(error))
})

test('it can provide an onValidationError handler', async () => {
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

    await precognition.get('https://laravel.com', {
        onValidationError: (p, e) => {
            expect(p).toBe(error.response.data.errors)
            expect(e).toBe(error)

            return 'expected return'
        },
    }).then(value => expect(value).toBe('expected return'))
})

test('it can provide an onUnauthorized handler', async () => {
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

    await precognition.get('https://laravel.com', {
        onUnauthorized: (p, e) => {
            expect(p).toBe(error.response)
            expect(e).toBe(error)

            return 'expected return'
        },
    }).then(value => expect(value).toBe('expected return'))
})

test('it can provide an onForbidden handler', async () => {
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

    await precognition.get('https://laravel.com', {
        onForbidden: (p, e) => {
            expect(p).toBe(error.response)
            expect(e).toBe(error)

            return 'expected return'
        },
    }).then(value => expect(value).toBe('expected return'))
})

test('it can provide an onNotFound handler', async () => {
    expect.assertions(3)

    const error = {
        response: {
            headers: { precognition: 'true' },
            status: 404,
            data: 'expected data',
        },
    }
    axios.request.mockRejectedValueOnce(error)
    axios.isAxiosError.mockReturnValueOnce(true)

    await precognition.get('https://laravel.com', {
        onNotFound: (p, e) => {
            expect(p).toBe(error.response)
            expect(e).toBe(error)

            return 'expected return'
        },
    }).then(value => expect(value).toBe('expected return'))
})

test('it can provide an onConflict handler', async () => {
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

    await precognition.get('https://laravel.com', {
        onConflict: (p, e) => {
            expect(p).toBe(error.response)
            expect(e).toBe(error)

            return 'expected return'
        },
    }).then(value => expect(value).toBe('expected return'))
})

test('it can provide an onLocked handler', async () => {
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

    await precognition.get('https://laravel.com', {
        onLocked: (p, e) => {
            expect(p).toBe(error.response)
            expect(e).toBe(error)

            return 'expected return'
        },
    }).then(value => expect(value).toBe('expected return'))
})

test('it can provide a list of inputs to validate', async () => {
    expect.assertions(1)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await precognition.get('https://laravel.com', {
        validate: ['username', 'email'],
    })

    expect(config.headers['Precognition-Validate-Only']).toBe('username,email')
})

test('it creates request identifier and adds signal', async () => {
    expect.assertions(2)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await precognition.get('https://laravel.com')

    expect(config.requestId).toBe('get:https://laravel.com')
    expect(config.signal).toBeInstanceOf(AbortSignal)
})

test('it uses baseURL from axios in request identifier', async () => {
    expect.assertions(2)

    let config
    axios.defaults.baseURL = 'https://laravel.com'
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await precognition.get('/docs')

    expect(config.requestId).toBe('get:https://laravel.com/docs')
    expect(config.signal).toBeInstanceOf(AbortSignal)
})

test('it config baseURL takes precedence for request id', async () => {
    expect.assertions(2)

    let config
    axios.defaults.baseURL = 'https://laravel.com'
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await precognition.get('/docs', {
        baseURL: 'https://forge.laravel.com',
    })

    expect(config.requestId).toBe('get:https://forge.laravel.com/docs')
    expect(config.signal).toBeInstanceOf(AbortSignal)
})

test('it can pass request identifier to config', async () => {
    expect.assertions(2)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await precognition.get('/docs', {
        requestId: 'expected-id',
    })

    expect(config.requestId).toBe('expected-id')
    expect(config.signal).toBeInstanceOf(AbortSignal)
})

test('it set request identifier resolver', async () => {
    expect.assertions(2)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })
    precognition.useRequestIdResolver(() => 'expected-id')

    await precognition.get('/docs')

    expect(config.requestId).toBe('expected-id')
    expect(config.signal).toBeInstanceOf(AbortSignal)
})

test('it config requestId takes precedence for request id', async () => {
    expect.assertions(2)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })
    precognition.useRequestIdResolver(() => 'foo')

    await precognition.get('/docs', {
        requestId: 'expected-id',
    })

    expect(config.requestId).toBe('expected-id')
    expect(config.signal).toBeInstanceOf(AbortSignal)
})

test('it can opt out of signals with `null`', async () => {
    expect.assertions(2)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await precognition.get('/docs', {
        requestId: null,
    })

    expect(config.requestId).toBe(null)
    expect(config.signal).toBeUndefined()
})

test('it does not create signal when one is provided', async () => {
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

    await precognition.get('/docs', {
        signal: controller.signal,
    })
    config.signal.dispatchEvent(new Event('foo'))

    expect(called).toBe(true)
})

test('it does not create signal when a cancelToken is provided', async () => {
    expect.assertions(1)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
    })

    await precognition.get('/docs', {
        cancelToken: { /* ... */ },
    })

    expect(config.signal).toBeUndefined()
})

test('it can start a poll', async () => {
    expect.assertions(4)
    const callback = jest.fn().mockResolvedValue({})
    let promise

    precognition.poll(() => promise = callback()).start()

    jest.advanceTimersByTime(59999)
    await promise
    expect(callback).toHaveBeenCalledTimes(0)

    jest.advanceTimersByTime(1)
    await promise
    expect(callback).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(60000)
    await promise
    expect(callback).toHaveBeenCalledTimes(2)

    jest.advanceTimersByTime(60000)
    await promise
    expect(callback).toHaveBeenCalledTimes(3)
})

test('it can stop a poll', async () => {
    expect.assertions(7)
    const callback = jest.fn().mockResolvedValue({})
    let promise
    const poll = precognition.poll(() => promise = callback())

    poll.start()

    await promise
    expect(callback).toHaveBeenCalledTimes(0)

    jest.advanceTimersByTime(60000)

    poll.stop()
    await promise
    expect(callback).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(60000)

    poll.start()
    await promise
    expect(callback).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(60000)

    poll.stop()
    await promise
    expect(callback).toHaveBeenCalledTimes(2)

    jest.advanceTimersByTime(60000)

    poll.start()
    await promise
    expect(callback).toHaveBeenCalledTimes(2)

    jest.advanceTimersByTime(60000)

    poll.stop()
    await promise
    expect(callback).toHaveBeenCalledTimes(3)

    jest.advanceTimersByTime(60000)

    await promise
    expect(callback).toHaveBeenCalledTimes(3)
})

test('it reports error when starting an already started poll', async () => {
    expect.assertions(12)
    console.warn = jest.fn()
    const callback = jest.fn().mockResolvedValue({})
    let promise
    const poll = precognition.poll(() => promise = callback())

    poll.start()

    expect(console.warn).toBeCalledTimes(0)
    jest.advanceTimersByTime(60000)
    await promise
    expect(callback).toBeCalledTimes(1)

    poll.start()

    expect(console.warn).toBeCalledTimes(1)
    jest.advanceTimersByTime(60000)
    await promise
    expect(callback).toBeCalledTimes(2)

    poll.start()

    expect(console.warn).toBeCalledTimes(2)
    jest.advanceTimersByTime(60000)
    await promise
    expect(callback).toBeCalledTimes(3)

    poll.stop()

    expect(console.warn).toBeCalledTimes(2)
    jest.advanceTimersByTime(60000)
    await promise
    expect(callback).toBeCalledTimes(3)

    poll.start()

    expect(console.warn).toBeCalledTimes(2)
    jest.advanceTimersByTime(60000)
    await promise
    expect(callback).toBeCalledTimes(4)

    poll.start()

    expect(console.warn).toBeCalledTimes(3)
    jest.advanceTimersByTime(60000)
    await promise
    expect(callback).toBeCalledTimes(5)
})

test('it reports error when stopping a poll that has not started', async () => {
    expect.assertions(8)
    console.warn = jest.fn()
    const callback = jest.fn().mockResolvedValue({})
    let promise
    const poll = precognition.poll(() => promise = callback())

    poll.stop()

    expect(console.warn).toBeCalledTimes(1)
    jest.advanceTimersByTime(60000)
    await promise
    expect(callback).toBeCalledTimes(0)

    poll.stop()

    expect(console.warn).toBeCalledTimes(2)
    jest.advanceTimersByTime(60000)
    await promise
    expect(callback).toBeCalledTimes(0)

    poll.start()

    expect(console.warn).toBeCalledTimes(2)
    jest.advanceTimersByTime(60000)
    await promise
    expect(callback).toBeCalledTimes(1)

    poll.stop()

    expect(console.warn).toBeCalledTimes(2)
    jest.advanceTimersByTime(60000)
    await promise
    expect(callback).toBeCalledTimes(1)
})

test('it can configure the timeout', async () => {
    expect.assertions(8)
    const callback = jest.fn().mockResolvedValue({})
    let promise
    const poll = precognition.poll(() => promise = callback())

    poll.every({
        milliseconds: 5,
    }).start()

    jest.advanceTimersByTime(5)
    await promise
    expect(callback).toBeCalledTimes(1)
    jest.advanceTimersByTime(5)
    await promise
    expect(callback).toBeCalledTimes(2)

    poll.stop().every({
        seconds: 5,
    }).start()

    jest.advanceTimersByTime(5000)
    await promise
    expect(callback).toBeCalledTimes(3)

    jest.advanceTimersByTime(5000)
    await promise
    expect(callback).toBeCalledTimes(4)

    poll.stop().every({
        minutes: 5,
    }).start()

    jest.advanceTimersByTime(300000)
    await promise
    expect(callback).toBeCalledTimes(5)

    jest.advanceTimersByTime(300000)
    await promise
    expect(callback).toBeCalledTimes(6)

    poll.stop().every({
        hours: 5,
    }).start()

    jest.advanceTimersByTime(18000000)
    await promise
    expect(callback).toBeCalledTimes(7)

    jest.advanceTimersByTime(18000000)
    await promise
    expect(callback).toBeCalledTimes(8)
})

test('it can change the timeout while running', async () => {
    expect.assertions(5)
    const callback = jest.fn().mockResolvedValue({})
    let promise
    const poll = precognition.poll(callback)

    poll.every({
        milliseconds: 5,
    }).start()

    jest.advanceTimersByTime(5)
    await promise
    expect(callback).toBeCalledTimes(1)
    jest.advanceTimersByTime(5)
    await promise
    expect(callback).toBeCalledTimes(2)

    poll.every({
        seconds: 5,
    })

    jest.advanceTimersByTime(5)
    await promise
    expect(callback).toBeCalledTimes(3)
    jest.advanceTimersByTime(5000)
    await promise
    expect(callback).toBeCalledTimes(4)
    jest.advanceTimersByTime(5000)
    await promise
    expect(callback).toBeCalledTimes(5)
})

test('it exports client as default and named', () => {
    expect(precognition).toBe(client)
    expect(precognition.poll).toBe(poll)
})
