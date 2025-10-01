import { it, vi, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { client } from '../src/client'
import { createValidator } from '../src/validator'
import { merge } from 'lodash-es'

const precognitionSuccessResponse = (payload) => merge({
    status: 204,
    data: {},
    headers: {
        precognition: 'true',
        'precognition-success': 'true',
    },
}, payload)

const precognitionFailedResponse = (payload) => precognitionSuccessResponse(merge({
    status: 422,
    data: { errors: {} },
    headers: {
        'precognition-success': '',
    },
}, payload))

const assertPendingValidateDebounceAndClear = async () => {
    const counters = [vi.getTimerCount()]
    await vi.advanceTimersByTimeAsync(1499)
    counters.push(vi.getTimerCount())
    await vi.advanceTimersByTimeAsync(1)
    counters.push(vi.getTimerCount())

    expect(counters).toStrictEqual([1, 1, 0])
}

beforeEach(() => {
    vi.mock('axios', async () => {
        const axios = await vi.importActual('axios')

        const isAxiosError = (value) => typeof value === 'object' && typeof value.response === 'object' && value.response.status >= 400

        return {
            ...axios,
            isAxiosError,
            default: {
                ...axios.default,
                request: vi.fn(),
                isAxiosError,
            },
        }
    })

    vi.useFakeTimers()
    client.use(axios)
})

afterEach(() => {
    vi.restoreAllMocks()

    if (vi.getTimerCount() > 0) {
        throw `There are ${vi.getTimerCount()} active timers`
    }
})

it('revalidates data when validate is called', async () => {
    expect.assertions(4)

    let requests = 0
    axios.request.mockImplementation(() => {
        requests++

        return Promise.resolve(precognitionSuccessResponse())
    })
    let data
    const validator = createValidator((client) => client.post('/foo', data))

    expect(requests).toBe(0)

    data = { name: 'Tim' }
    validator.validate('name', 'Tim')
    expect(requests).toBe(1)
    await vi.advanceTimersByTimeAsync(1500)

    data = { name: 'Jess' }
    validator.validate('name', 'Jess')
    expect(requests).toBe(2)
    await vi.advanceTimersByTimeAsync(1500)

    data = { name: 'Taylor' }
    validator.validate('name', 'Taylor')
    expect(requests).toBe(3)
    await vi.advanceTimersByTimeAsync(1500)
})

it('does not revalidate data when data is unchanged', async () => {
    expect.assertions(4)

    let requests = 0
    axios.request.mockImplementation(() => {
        requests++

        return Promise.resolve(precognitionSuccessResponse())
    })
    let data = {}
    const validator = createValidator((client) => client.post('/foo', data))

    expect(requests).toBe(0)

    data = { first: true }
    validator.validate('first', true)
    expect(requests).toBe(1)
    await vi.advanceTimersByTimeAsync(1500)

    data = { first: true }
    validator.validate('first', true)
    expect(requests).toBe(1)
    await vi.advanceTimersByTimeAsync(1500)

    data = { second: true }
    validator.validate('second', true)
    expect(requests).toBe(2)
    await vi.advanceTimersByTimeAsync(1500)
})

it('accepts laravel formatted validation errors for setErrors', () => {
    expect.assertions(1)

    const validator = createValidator((client) => client.post('/foo', {}), {
        name: 'Tim',
        location: 'Melbourne',
    })

    validator.setErrors({
        name: ['xxxx'],
        location: ['xxxx', 'yyyy'],
    })
    expect(validator.errors()).toEqual({
        name: ['xxxx'],
        location: ['xxxx', 'yyyy'],
    })
})

it('accepts inertia formatted validation errors for setErrors', () => {
    expect.assertions(1)

    const validator = createValidator((client) => client.post('/foo', {}), {
        name: 'Tim',
        location: 'Melbourne',
    })

    validator.setErrors({
        name: 'xxxx',
        location: 'yyyy',
    })
    expect(validator.errors()).toEqual({
        name: ['xxxx'],
        location: ['yyyy'],
    })
})

it('triggers errorsChanged event when setting errors', () => {
    expect.assertions(2)

    const validator = createValidator((client) => client.post('/foo', {}), {
        name: 'Tim',
    })
    let triggered = 0

    validator.on('errorsChanged', () => triggered++)

    validator.setErrors({
        name: 'xxxx',
    })
    expect(triggered).toEqual(1)

    validator.setErrors({
        name: 'yyyy',
    })
    expect(triggered).toEqual(2)
})

it('doesnt trigger errorsChanged event when errors are the same', () => {
    expect.assertions(2)

    const validator = createValidator((client) => client.post('/foo', {}), {
        name: 'Tim',
    })
    let triggered = 0

    validator.on('errorsChanged', () => triggered++)

    validator.setErrors({
        name: 'xxxx',
    })
    expect(triggered).toEqual(1)

    validator.setErrors({
        name: 'xxxx',
    })
    expect(triggered).toEqual(1)
})

it('returns errors via hasErrors function', () => {
    expect.assertions(3)

    const validator = createValidator((client) => client.post('/foo', {}), {
        name: 'Tim',
    })

    expect(validator.hasErrors()).toBe(false)

    validator.setErrors({
        name: 'xxxx',
    })
    expect(validator.hasErrors()).toBe(true)

    validator.setErrors({})
    expect(validator.hasErrors()).toBe(false)
})

it('is not valid before it has been validated', async () => {
    expect.assertions(2)

    const validator = createValidator((client) => client.post('/foo', {}), {
        name: 'Tim',
    })

    expect(validator.valid()).toEqual([])

    validator.setErrors({
        name: 'xxxx',
    })

    expect(validator.valid()).toEqual([])
})

it('does not validate if the field has not been changed', async () => {
    let requestMade = false
    axios.request.mockImplementation(() => {
        requestMade = true
        return Promise.resolve(precognitionSuccessResponse())
    })
    const validator = createValidator((client) => client.post('/foo', {}), {
        name: 'Tim',
    })

    validator.validate('name', 'Tim')

    expect(requestMade).toBe(false)
})

it('filters out files', async () => {
    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve(precognitionSuccessResponse())
    })
    const validator = createValidator((client) => client.post('/foo', {
        name: 'Tim',
        email: null,
        fruits: [
            'apple',
            'banana',
            new Blob([], { type: 'image/png' }),
            ['nested', new Blob([], { type: 'image/png' })],
            {
                name: 'Tim',
                email: null,
                avatar: new Blob([], { type: 'image/png' }),
            },
        ],
        avatar: new Blob([], { type: 'image/png' }),
        nested: {
            name: 'Tim',
            email: null,
            fruits: [
                'apple',
                'banana',
                new Blob([], { type: 'image/png' }),
            ],
            avatar: new Blob([], { type: 'image/png' }),
            nested: {
                name: 'Tim',
                email: null,
                fruits: [
                    'apple',
                    'banana',
                    new Blob([], { type: 'image/png' }),
                ],
                avatar: new Blob([], { type: 'image/png' }),
            },
        },
    }))

    validator.validate('text', 'Tim')

    expect(config.data).toEqual({
        name: 'Tim',
        email: null,
        fruits: [
            'apple',
            'banana',
            ['nested'],
            {
                name: 'Tim',
                email: null,
            },
        ],
        nested: {
            name: 'Tim',
            email: null,
            fruits: [
                'apple',
                'banana',
            ],
            nested: {
                name: 'Tim',
                email: null,
                fruits: [
                    'apple',
                    'banana',
                ],
            },
        },
    })

    await assertPendingValidateDebounceAndClear()
})

it('doesnt mark fields as validated while response is pending',  async () => {
    expect.assertions(10)

    let resolver = null
    let rejector = null
    let onValidatedChangedCalledTimes = 0
    axios.request.mockImplementation(() => {
        return new Promise((resolve, reject) => {
            resolver = resolve
            rejector = (response) => reject({ response: response })
        })
    })
    let data = {}
    const validator = createValidator((client) => client.post('/foo', data))
    validator.on('validatedChanged', () => onValidatedChangedCalledTimes++)

    expect(validator.valid()).toEqual([])
    expect(onValidatedChangedCalledTimes).toEqual(0)

    data = { app: 'Laravel' }
    expect(validator.valid()).toEqual([])

    validator.validate('app', 'Laravel')
    expect(validator.valid()).toEqual([])

    resolver(precognitionSuccessResponse())
    await vi.advanceTimersByTimeAsync(1500)
    expect(validator.valid()).toEqual(['app'])
    expect(onValidatedChangedCalledTimes).toEqual(1)

    data = { app: 'Laravel', version: '10' }
    expect(validator.valid()).toEqual(['app'])

    validator.validate('version', '10')
    expect(validator.valid()).toEqual(['app'])

    rejector(precognitionFailedResponse())
    await vi.advanceTimersByTimeAsync(1500)
    expect(validator.valid()).toEqual(['app', 'version'])
    expect(onValidatedChangedCalledTimes).toEqual(2)
})

it('doesnt mark fields as validated on error status', async () => {
    expect.assertions(6)

    let rejector = null
    let onValidatedChangedCalledTimes = 0
    axios.request.mockImplementation(() => {
        return new Promise((_, reject) => {
            rejector = (response) => reject({ response: response })
        })
    })
    let data = {}
    const validator = createValidator((client) => client.post('/foo', data))
    validator.on('validatedChanged', () => onValidatedChangedCalledTimes++)

    expect(validator.valid()).toEqual([])
    expect(onValidatedChangedCalledTimes).toEqual(0)

    data = { app: 'Laravel' }
    expect(validator.valid()).toEqual([])

    validator.validate('app', 'Laravel', {
        onUnauthorized: () => null,
    })
    expect(validator.valid()).toEqual([])

    rejector(precognitionFailedResponse({ status: 401 }))
    await vi.advanceTimersByTimeAsync(1500)

    expect(validator.valid()).toEqual([])
    expect(onValidatedChangedCalledTimes).toEqual(0)
})

it('does mark fields as validated on success status', async () => {
    expect.assertions(6)

    let resolver = null
    let promise = null
    let onValidatedChangedCalledTimes = 0
    axios.request.mockImplementation(() => {
        promise = new Promise((resolve) => {
            resolver = resolve
        })

        return promise
    })
    let data = {}
    const validator = createValidator((client) => client.post('/foo', data))
    validator.on('validatedChanged', () => onValidatedChangedCalledTimes++)

    expect(validator.valid()).toEqual([])
    expect(onValidatedChangedCalledTimes).toEqual(0)

    data = { app: 'Laravel' }
    expect(validator.valid()).toEqual([])

    validator.validate('app', 'Laravel')
    expect(validator.valid()).toEqual([])

    resolver(precognitionSuccessResponse())
    await vi.advanceTimersByTimeAsync(1500)
    expect(validator.valid()).toEqual(['app'])
    expect(onValidatedChangedCalledTimes).toEqual(1)
})

it('can mark fields as touched', () => {
    const validator = createValidator((client) => client.post('/foo', {}))

    validator.touch('name')
    expect(validator.touched()).toEqual(['name'])

    validator.touch(['foo', 'bar'])
    expect(validator.touched()).toEqual(['name', 'foo', 'bar'])
})

it('revalidates when touched changes', async () => {
    expect.assertions(1)

    let requests = 0
    const resolvers = []
    const promises = []
    const configs = []
    axios.request.mockImplementation((c) => {
        requests++
        configs.push(c)

        const promise = new Promise((resolve) => {
            resolvers.push(resolve)
        })

        promises.push(promise)

        return promise
    })
    let data = { version: '10' }
    const validator = createValidator((client) => client.post('/foo', data))

    data = { app: 'Laravel' }
    validator.validate('app', 'Laravel')
    validator.touch('version')
    validator.validate('app', 'Laravel')
    await vi.advanceTimersByTimeAsync(1500)
    expect(requests).toBe(2)
})

it('validates touched fields when calling validate without specifying any fields', async () => {
    expect.assertions(2)

    let requests = 0
    let config
    axios.request.mockImplementation((c) => {
        config = c
        requests++

        return Promise.resolve(precognitionSuccessResponse())
    })
    const data = { name: 'Tim', framework: 'Laravel' }
    const validator = createValidator((client) => client.post('/foo', data))

    validator.touch(['name', 'framework']).validate()
    expect(config.headers['Precognition-Validate-Only']).toBe('name,framework')

    await assertPendingValidateDebounceAndClear()
})

it('marks fields as valid on precognition success', async () => {
    expect.assertions(5)

    let requests = 0
    axios.request.mockImplementation(() => {
        requests++

        return Promise.resolve(precognitionSuccessResponse())
    })
    const validator = createValidator((client) => client.post('/foo', {}))
    let valid = null
    validator.setErrors({ name: 'Required' }).touch('name').on('errorsChanged', () => {
        valid = validator.valid()
    })

    expect(validator.valid()).toStrictEqual([])
    expect(valid).toBeNull()

    validator.validate()
    await vi.advanceTimersByTimeAsync(1500)

    expect(requests).toBe(1)
    expect(validator.valid()).toStrictEqual(['name'])
    expect(valid).toStrictEqual(['name'])
})

it('calls locally configured onSuccess handler', async () => {
    let response = null
    axios.request.mockImplementation(async () => precognitionSuccessResponse({ data: 'response-data' }))
    const validator = createValidator((client) => client.post('/users', {}))

    validator.validate('name', 'Tim', {
        onSuccess: (r) => response = r,
    })
    await vi.advanceTimersByTimeAsync(1500)

    expect(response.data).toBe('response-data')
})

it('calls globally configured onSuccess handler', async () => {
    let response = null
    axios.request.mockImplementation(async () => precognitionSuccessResponse({ data: 'response-data' }))
    const validator = createValidator((client) => client.post('/users', {}, {
        onSuccess: (r) => response = r,
    }))

    validator.validate('name', 'Tim')
    await vi.advanceTimersByTimeAsync(1500)

    expect(response.data).toBe('response-data')
})

it('local config overrides global config', async () => {
    let response
    axios.request.mockImplementation(async () => precognitionSuccessResponse({ data: 'response-data' }))
    const validator = createValidator((client) => client.post('/users', { name: 'Tim' }, {
        onPrecognitionSuccess: (r) => {
            r.data = r.data + ':global-handler'
            response = r
        },
    }))
    validator.touch('name')

    validator.validate({
        onPrecognitionSuccess: (r) => {
            r.data = r.data + ':local-handler'

            response = r
        },
    })
    await vi.advanceTimersByTimeAsync(1500)

    expect(response.data).toBe('response-data:local-handler')
})

it('correctly merges axios config', async () => {
    let config = null
    axios.request.mockImplementation(async (c) => {
        config = c

        return precognitionSuccessResponse()
    })
    const validator = createValidator((client) => client.post('/users', {}, {
        headers: {
            'X-Global': '1',
            'X-Both': ['global'],
        },
    }))

    validator.validate('name', 'Tim', {
        headers: {
            'X-Local': '1',
            'X-Both': ['local'],
        },
    })
    await vi.advanceTimersByTimeAsync(1500)

    expect(config.headers).toEqual({
        'X-Global': '1',
        'X-Local': '1',
        'X-Both': ['local'],
        // others...
        'Content-Type': 'application/json',
        Precognition: true,
        'Precognition-Validate-Only': 'name',
    })
})

it('uses the lastest config values', async () => {
    const config = []
    axios.request.mockImplementation(async (c) => {
        config.push(c)

        return precognitionSuccessResponse()
    })
    let data = {}
    const validator = createValidator((client) => client.post('/users', data))

    data = { name: 'Tim' }
    validator.validate('name', data.name, {
        headers: {
            'X-Header': '1',
        },
    })
    data = { name: 'Jess' }
    validator.validate('name', data.name, {
        headers: {
            'X-Header': '2',
        },
    })
    data = { name: 'Taylor' }
    validator.validate('name', data.name, {
        headers: {
            'X-Header': '3',
        },
    })
    await vi.advanceTimersByTimeAsync(1500)

    expect(config).toHaveLength(2)
    expect(config[0].headers['X-Header']).toBe('1')
    expect(config[1].headers['X-Header']).toBe('3')
})

it('does not cancel submit requests', async () => {
    const data = {}
    let submitConfig
    let validateConfig
    axios.request.mockImplementation((config) => {
        if (config.precognitive) {
            validateConfig = config
        } else {
            submitConfig = config
        }

        return Promise.resolve({ headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: '' })
    })
    const validator = createValidator((client) => client.post('/foo', data))

    data.name = 'Tim'
    client.post('/foo', data, { precognitive: false })
    validator.validate('name', 'Tim')

    expect(submitConfig.signal).toBeUndefined()
    expect(validateConfig.signal).toBeInstanceOf(AbortSignal)
    expect(validateConfig.signal.aborted).toBe(false)

    await assertPendingValidateDebounceAndClear()
})

it('does not cancel submit requests with custom abort signal', async () => {
    const data = {}
    let submitConfig
    let validateConfig
    const abortController = new AbortController
    axios.request.mockImplementation((config) => {
        if (config.precognitive) {
            validateConfig = config
        } else {
            submitConfig = config
        }

        return Promise.resolve({ headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: '' })
    })
    const validator = createValidator((client) => client.post('/foo', data))

    data.name = 'Tim'
    client.post('/foo', data, { precognitive: false, signal: abortController.signal })
    validator.validate('name', 'Tim')

    expect(submitConfig.signal).toBe(abortController.signal)
    expect(submitConfig.signal.aborted).toBe(false)
    expect(validateConfig.signal).toBeInstanceOf(AbortSignal)
    expect(validateConfig.signal.aborted).toBe(false)

    await assertPendingValidateDebounceAndClear()
})

it('supports async validate with only key for untouched values', async () => {
    let config
    axios.request.mockImplementation((c) => {
        config = c

        return Promise.resolve({ headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: '' })
    })
    const validator = createValidator((client) => client.post('/foo', {}))

    validator.validate({
        only: ['name', 'email'],
    })

    expect(config.headers['Precognition-Validate-Only']).toBe('name,email')

    await assertPendingValidateDebounceAndClear()
})

it('supports async validate with depricated validate key for untouched values', async () => {
    let config
    axios.request.mockImplementation((c) => {
        config = c

        return Promise.resolve({ headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: '' })
    })
    const validator = createValidator((client) => client.post('/foo', {}))

    validator.validate({
        validate: ['name', 'email'],
    })

    expect(config.headers['Precognition-Validate-Only']).toBe('name,email')

    await assertPendingValidateDebounceAndClear()
})

it('does not include already touched keys when specifying keys via only', async () => {
    let config
    axios.request.mockImplementation((c) => {
        config = c

        return Promise.resolve({ headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: '' })
    })
    const validator = createValidator((client) => client.post('/foo', {}))


    validator.touch(['email']).validate({
        only: ['name'],
    })

    expect(config.headers['Precognition-Validate-Only']).toBe('name')

    await assertPendingValidateDebounceAndClear()
})

it('marks fields as touched when the input has been included in validation', async () => {
    axios.request.mockImplementation(() => {
        return Promise.resolve({ headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: '' })
    })
    const validator = createValidator((client) => client.post('/foo', {}))


    validator.touch(['email']).validate({
        only: ['name'],
    })

    expect(validator.touched()).toEqual(['email', 'name'])

    await assertPendingValidateDebounceAndClear()
})
