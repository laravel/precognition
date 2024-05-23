import { it, vi, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { client } from '../src/client'
import { createValidator } from '../src/validator'
import {IgnorablePrecognitionError, PrecognitionError} from '../src/error'
import {merge} from 'lodash-es'

const precognitiveResponse = payload => merge({
    status: 204,
    data: {},
    headers: {
        precognition: 'true',
        'precognition-success': 'true',
    },
}, payload)

const assertPendingValidateDebounceAndClear = () => {
    const counters = [vi.getTimerCount()]
    vi.advanceTimersByTime(1499)
    counters.push(vi.getTimerCount())
    vi.advanceTimersByTime(1)
    counters.push(vi.getTimerCount())

    expect(counters).toStrictEqual([1, 1, 0])
}

beforeEach(() => {
    vi.mock('axios', async () => {
        const axios = await vi.importActual('axios')

        const isCancel = vi.fn(() => false)
        const isAxiosError = vi.fn(() => false)
        return {
            ...axios,
            isCancel,
            isAxiosError,
            default: {
                ...axios.default,
                request: vi.fn(),
                isCancel,
                isAxiosError,
            }
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
    expect.assertions(5)

    let name = null
    let requests = 0
    axios.request.mockImplementation(async () => {
        requests++

        return precognitiveResponse()
    })
    const validator = createValidator(client => client.post('/users', { name }))

    expect(requests).toBe(0)

    name = 'Tim'
    await validator.validate('name', name)
    expect(requests).toBe(1)

    vi.advanceTimersByTime(1500)

    name = 'Jess'
    await validator.validate('name', name)
    expect(requests).toBe(2)

    vi.advanceTimersByTime(1500)

    name = 'Taylor'
    await validator.validate('name', name)
    expect(requests).toBe(3)

    assertPendingValidateDebounceAndClear()
})

it('does not revalidate when data is unchanged', async () => {
    expect.assertions(5)

    let data = null
    let requests = 0
    axios.request.mockImplementation(async () => {
        requests++

        return precognitiveResponse()
    })
    const validator = createValidator(client => client.post('/users', data))

    expect(requests).toBe(0)

    data = { name: 'Tim' }
    await validator.validate('name', data.name)
    expect(requests).toBe(1)

    vi.advanceTimersByTime(1500)

    await validator.validate('name', data.name)
    expect(requests).toBe(1)

    vi.advanceTimersByTime(1500)

    data = { name: 'Tim', location: 'Melbourne' }
    await validator.validate('name', data.name)
    expect(requests).toBe(2)

    assertPendingValidateDebounceAndClear()
})

it('accepts laravel formatted validation errors for setErrors', () => {
    expect.assertions(1)

    const validator = createValidator(() => null)

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

    const validator = createValidator(() => null)

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

    let triggered = 0
    const validator = createValidator(() => null)
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

    let triggered = 0
    const validator = createValidator(() => null)
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

    const validator = createValidator(() => null)

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

    const validator = createValidator(() => null)

    expect(validator.valid()).toEqual([])

    validator.setErrors({
        name: 'xxxx',
    })

    expect(validator.valid()).toEqual([])
})

it('does not validate if the field has not been changed', async () => {
    expect.assertions(2)

    let requests = 0
    let data = { name: 'Tim' }
    axios.request.mockImplementation(async () => {
        requests++

        return precognitiveResponse()
    })
    const validator = createValidator(client => client.post('/users', data), data)

    await validator.validate('name', data.name)

    expect(requests).toBe(0)

    assertPendingValidateDebounceAndClear()
})

it('filters out files', async () => {
    expect.assertions(2)

    let config = null
    axios.request.mockImplementationOnce(async c => {
        config = c

        return precognitiveResponse()
    })
    const validator = createValidator(client => client.post('/users', {
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
            nested: {
                name: 'Tim',
                email: null,
                fruits: [
                    'apple',
                    'banana',
                    new Blob([], { type: 'image/png' }),
                ],
                avatar: new Blob([], { type: 'image/png' }),
            }
        }
    }))

    await validator.validate('text', 'Tim')

    expect(config.data).toEqual({
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
            nested: {
                name: 'Tim',
                email: null,
                fruits: [
                    'apple',
                    'banana',
                ],
            }
        }
    })

    assertPendingValidateDebounceAndClear()
})

it('doesnt mark fields as validated while response is pending', async () => {
    expect.assertions(5)

    let pendingRequest = null
    let data = { app: 'Laravel' }
    let onValidatedChangedCalledTimes = 0
    axios.request.mockImplementation(async () => precognitiveResponse())
    const validator = createValidator(client => client.post('/users', data))
    validator.on('validatedChanged', () => onValidatedChangedCalledTimes++)

    pendingRequest = validator.validate('app', data.app)
    expect(onValidatedChangedCalledTimes).toEqual(0)
    expect(validator.valid()).toEqual([])

    await pendingRequest
    expect(validator.valid()).toEqual(['app'])
    expect(onValidatedChangedCalledTimes).toEqual(1)

    assertPendingValidateDebounceAndClear()
})

it('doesnt mark fields as validated on error status', async () => {
    expect.assertions(5)

    let pendingRequest = null
    let data = { app: 'Laravel' }
    let onValidatedChangedCalledTimes = 0
    axios.request.mockImplementation(async () => precognitiveResponse({ status: 401, headers: { 'precognition-success' : undefined } }))
    const validator = createValidator(client => client.post('/users', data))
    validator.on('validatedChanged', () => onValidatedChangedCalledTimes++)

    pendingRequest = validator.validate('app', data.app)
    expect(validator.valid()).toEqual([])
    expect(onValidatedChangedCalledTimes).toEqual(0)

    await pendingRequest
    expect(validator.valid()).toEqual([])
    expect(onValidatedChangedCalledTimes).toEqual(0)

    assertPendingValidateDebounceAndClear()
})

it('does mark fields as validated on any success status', async () => {
    expect.assertions(5)

    let pendingRequest = null
    let data = { app: 'Laravel' }
    let onValidatedChangedCalledTimes = 0
    axios.request.mockImplementation(async () => precognitiveResponse({ status: 200 }))
    const validator = createValidator(client => client.post('/users', data))
    validator.on('validatedChanged', () => onValidatedChangedCalledTimes++)

    pendingRequest = validator.validate('app', 'Laravel')
    expect(validator.valid()).toEqual([])
    expect(onValidatedChangedCalledTimes).toEqual(0)

    await pendingRequest
    expect(validator.valid()).toEqual(['app'])
    expect(onValidatedChangedCalledTimes).toEqual(1)

    assertPendingValidateDebounceAndClear()
})

it('can mark fields as touched', () => {
    const validator = createValidator(() => null)

    expect(validator.touched()).toEqual([])

    validator.touch('name')
    expect(validator.touched()).toEqual(['name'])

    validator.touch(['foo', 'bar'])
    expect(validator.touched()).toEqual(['name', 'foo', 'bar'])
})

it('revalidates when touched changes', async () => {
    expect.assertions(4)

    let requests = 0
    let data = { app: 'Laravel', version: '10' }
    axios.request.mockImplementation(async () => {
        requests++

        return precognitiveResponse()
    })
    const validator = createValidator(client => client.post('/users', data))

    await validator.validate('app', data.app)
    expect(requests).toBe(1)

    vi.advanceTimersByTime(1500)

    await validator.validate('app', data.app)
    expect(requests).toBe(1)

    vi.advanceTimersByTime(1500)
    validator.touch('version')

    await validator.validate('app', data.app)
    expect(requests).toBe(2)

    assertPendingValidateDebounceAndClear()
})

it('can call validate without needing to specify a field', async () => {
    expect.assertions(2)

    let requests = 0
    let data = { name: 'Tim', framework: 'Laravel' }
    axios.request.mockImplementation(async () => {
        requests++

        return precognitiveResponse()
    })
    const validator = createValidator(client => client.post('/users', data))

    validator.touch('name')
    await validator.validate()
    expect(requests).toBe(1)

    assertPendingValidateDebounceAndClear()
})

it('marks fields as valid on precognition success', async () => {
    expect.assertions(4)

    let requests = 0
    let data = { name: 'Tim' }
    axios.request.mockImplementation(async () => {
        requests++

        return precognitiveResponse()
    })
    const validator = createValidator(client => client.post('/users', data))

    expect(validator.valid()).toEqual([])

    await validator.touch('name').validate()

    expect(requests).toBe(1)
    expect(validator.valid()).toEqual(['name'])

    assertPendingValidateDebounceAndClear()
})

it('can access the response object via the promise returned from validate', async () => {
    expect.assertions(2)

    let data = { name: 'Tim' }
    axios.request.mockImplementation(async () => precognitiveResponse({ data: 'response-data' }))
    const validator = createValidator(client => client.post('/users', data))

    const response = await validator.validate('name', data.name)

    expect(response.data).toBe('response-data')

    assertPendingValidateDebounceAndClear()
})

it('can handle generic errors while validating', async () => {
    expect.assertions(2)

    let data = { name: 'Tim' }
    axios.request.mockImplementation(async () => { throw 'Whoops!' })
    const validator = createValidator(client => client.post('/users', data))

    const response = await validator.validate('name', 'Tim').catch(error => 'error-caught: '+error)

    expect(response).toBe('error-caught: Whoops!')

    assertPendingValidateDebounceAndClear()
})

it('can handle axios exceptions that are thrown', async () => {
    expect.assertions(2)

    let data = { name: 'Tim' }
    axios.isAxiosError.mockReturnValue(true)
    axios.request.mockImplementation(async () => { throw 'Whoops!' })
    const validator = createValidator(client => client.post('/users', data))

    const response = await validator.validate('name', 'Tim').catch(error => 'error-caught: '+error)

    expect(response).toBe('error-caught: Whoops!')

    assertPendingValidateDebounceAndClear()
})

it('can handle cancelled in-flight requests', async () => {
    expect.assertions(5)

    let error = null
    let data = { name: 'Tim' }
    axios.isCancel.mockReturnValue(true)
    axios.isAxiosError.mockReturnValue(true)
    axios.request.mockImplementation(async () => { throw 'Whoops!' })
    const validator = createValidator(client => client.post('/users', data))

    await validator.validate('name', 'Tim').catch(e => (error = e))

    expect(error).toBeInstanceOf(PrecognitionError)
    expect(error).toBeInstanceOf(IgnorablePrecognitionError)
    expect(error.message).toBe('An in-flight Precognition request was cancelled.')
    expect(error.cause).toBe('Whoops!')

    assertPendingValidateDebounceAndClear()
})

it('never resolves promises returned from the validate call when re-calling the validate function', async () => {
    expect.assertions(4)

    let data = null
    const responses = []
    axios.request.mockImplementation(async () => precognitiveResponse())
    const validator = createValidator(client => client.post('/users', data))
    let resolved = 0

    data = { name: 'Tim' }
    responses.push(validator.validate('name', data.name).then(() => {
        resolved++

        return 'first'
    }))
    data = { name: 'Jess' }
    responses.push(validator.validate('name', data.name).then(() => {
        resolved++

        return 'second'
    }))
    data = { name: 'Taylor' }
    responses.push(validator.validate('name', data.name).then(() => {
        resolved++

        return 'third'
    }))

    vi.runAllTimers()

    try {
        await vi.waitUntil(async () => Promise.race([responses[0], responses[1]]))

        throw 'Did not timeout as expected!'
    } catch (e) {
        expect(e).toBeInstanceOf(Error)
        expect(e.message).toBe('Timed out in waitUntil!')
    }

    expect(await responses[2]).toBe('third')
    expect(resolved).toBe(1)
})

it('calls user configured onSuccess handlers', async () => {
    expect.assertions(2)

    let data = { name: 'Tim' }
    axios.request.mockImplementation(async () => precognitiveResponse({ data: 'response-data' }))
    const validator = createValidator(client => client.post('/users', data, {
        onSuccess: response => response.data+':global-handler'
    }))

    const response = await validator.validate('name', data.name)

    expect(response).toBe('response-data:global-handler')

    assertPendingValidateDebounceAndClear()
})

it('can pass config to individual validate calls', async () => {
    expect.assertions(2)

    let data = { name: 'Tim' }
    axios.request.mockImplementation(async () => precognitiveResponse({ data: 'response-data' }))
    const validator = createValidator(client => client.post('/users', data, {
        onPrecognitionSuccess: response => response.data+':global-handler'
    }))

    const response = await validator.validate('name', data.name, {
        onPrecognitionSuccess: response => response.data+':local-handler'
    })

    expect(response).toBe('response-data:local-handler')

    assertPendingValidateDebounceAndClear()
})

it('can pass config to individual validate calls without specifying input values', async () => {
    expect.assertions(2)

    axios.request.mockImplementation(async () => precognitiveResponse({ data: 'response-data' }))
    const validator = createValidator(client => client.post('/users', { name: 'Tim' }, {
        onPrecognitionSuccess: response => response.data+':global-handler'
    }))
    validator.touch('name')

    const response = await validator.validate({
        onPrecognitionSuccess: response => response.data+':local-handler'
    })

    expect(response).toBe('response-data:local-handler')

    assertPendingValidateDebounceAndClear()
})

it('correctly merges axios config', async () => {
    expect.assertions(2)

    let data = { name: 'Tim' }
    let config = null
    axios.request.mockImplementationOnce(async c => {
        config = c

        return precognitiveResponse()
    })
    const validator = createValidator(client => client.post('/users', data, {
        headers: {
            'X-Global': '1',
            'X-Both': ['global'],
        },
    }))

    await validator.validate('name', data.name, {
        headers: {
            'X-Local': '1',
            'X-Both': ['local']
        }
    })

    expect(config.headers).toEqual({
        'X-Global': '1',
        'X-Local': '1',
        'X-Both': ['local'],
        // others...
        'Content-Type': 'application/json',
        Precognition: true,
        'Precognition-Validate-Only': 'name'
    })

    assertPendingValidateDebounceAndClear()
})

