import axios from 'axios'
import precognition from '../src/index'

jest.mock('axios')
precognition.use(axios)

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

    axios.request.mockRejectedValueOnce({})
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
                errors: { name: ['expected error'] }
            }
        }
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
                errors: { name: ['expected error'] }
            }
        }
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
            data: 'expected data'
        }
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
            data: 'expected data'
        }
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
            data: 'expected data'
        }
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
            data: 'expected data'
        }
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
            data: 'expected data'
        }
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
        return Promise.resolve({ headers: { precognition: 'true' }})
    })

    await precognition.get('https://laravel.com', {
        validate: ['username', 'email']
    });

    expect(config.headers['Precognition-Validate-Only']).toBe('username,email')
})
