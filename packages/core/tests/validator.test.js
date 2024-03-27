import { it, vi, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { client } from '../src/client'
import { createValidator } from '../src/validator'
import {IgnorablePrecognitionError, PrecognitionError} from '../src/error'

beforeEach(() => {
    vi.mock('axios')
    vi.useFakeTimers()
    client.use(axios)
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.runAllTimers()
})

const precognitiveResponse = (payload) => ({ status: 204, data: {}, ...payload, headers: { precognition: 'true',  'precognition-success': 'true', ...payload?.headers },  })

it('revalidates data when validate is called', async () => {
    expect.assertions(4)

    let requests = 0
    axios.request.mockImplementation(() => {
        requests++

        return Promise.resolve(precognitiveResponse())
    })
    let data
    const validator = createValidator((client) => client.post('/foo', data))

    expect(requests).toBe(0)

    data = { name: 'Tim' }
    await validator.validate('name', 'Tim')
    expect(requests).toBe(1)
    vi.advanceTimersByTime(1500)

    data = { name: 'Jess' }
    await validator.validate('name', 'Jess')
    expect(requests).toBe(2)
    vi.advanceTimersByTime(1500)

    data = { name: 'Taylor' }
    await validator.validate('name', 'Taylor')
    expect(requests).toBe(3)
    vi.advanceTimersByTime(1500)
})

it('does not revalidate when data is unchanged', async () => {
    expect.assertions(4)

    let requests = 0
    axios.request.mockImplementation(() => {
        requests++

        return Promise.resolve(precognitiveResponse())
    })
    let data = {}
    const validator = createValidator((client) => client.post('/foo', data))

    expect(requests).toBe(0)

    data = { name: 'Tim' }
    await validator.validate('name', 'Tim')
    expect(requests).toBe(1)
    vi.advanceTimersByTime(1500)

    data = { name: 'Tim' }
    await validator.validate('name', 'Tim')
    expect(requests).toBe(1)
    vi.advanceTimersByTime(1500)

    data = { name: 'Tim', location: 'Melbourne' }
    await validator.validate('name', 'Tim')
    expect(requests).toBe(2)
    vi.advanceTimersByTime(1500)
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
    expect.assertions(1)

    let requests = 0
    axios.request.mockImplementation(() => {
        requests++

        return Promise.resolve(precognitiveResponse())
    })
    const validator = createValidator((client) => client.post('/foo', {}), {
        name: 'Tim',
    })

    await validator.validate('name', 'Tim')

    expect(requests).toBe(0)
})

it('filters out files', async () => {
    expect.assertions(1)

    let config
    axios.request.mockImplementationOnce((c) => {
        config = c

        return Promise.resolve(precognitiveResponse())
    })
    const validator = createValidator((client) => client.post('/foo', {
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
})

it('doesnt mark fields as validated while response is pending', async () => {
    expect.assertions(4)

    let pendingRequest = null
    let response = null
    let onValidatedChangedCalledTimes = 0
    axios.request.mockImplementation(() => Promise.resolve(response))
    let data = {}
    const validator = createValidator((client) => client.post('/foo', data))
    validator.on('validatedChanged', () => onValidatedChangedCalledTimes++)

    data = { app: 'Laravel' }
    response = precognitiveResponse({ status: 204, headers: { 'precognition-success': undefined }})
    pendingRequest = validator.validate('app', 'Laravel')
    expect(onValidatedChangedCalledTimes).toEqual(0)
    expect(validator.valid()).toEqual([])
    await pendingRequest
    expect(validator.valid()).toEqual(['app'])
    expect(onValidatedChangedCalledTimes).toEqual(1)
})

it('doesnt mark fields as validated on error status', async () => {
    expect.assertions(6)

    let response = null
    let pendingRequest = null
    let onValidatedChangedCalledTimes = 0
    axios.request.mockImplementation(() => Promise.resolve(response))
    let data = {}
    const validator = createValidator((client) => client.post('/foo', data))
    validator.on('validatedChanged', () => onValidatedChangedCalledTimes++)

    expect(validator.valid()).toEqual([])
    expect(onValidatedChangedCalledTimes).toEqual(0)

    data = { app: 'Laravel' }
    expect(validator.valid()).toEqual([])

    response = precognitiveResponse({ status: 401, headers: { 'precognition-success' : undefined } })
    pendingRequest = validator.validate('app', 'Laravel')
    expect(validator.valid()).toEqual([])

    await pendingRequest
    expect(validator.valid()).toEqual([])
    expect(onValidatedChangedCalledTimes).toEqual(0)
})

it('does mark fields as validated on success status', async () => {
    expect.assertions(6)

    let response = null
    let pendingRequest = null
    let onValidatedChangedCalledTimes = 0
    axios.request.mockImplementation(() => Promise.resolve(response))
    let data = {}
    const validator = createValidator((client) => client.post('/foo', data))
    validator.on('validatedChanged', () => onValidatedChangedCalledTimes++)

    expect(validator.valid()).toEqual([])
    expect(onValidatedChangedCalledTimes).toEqual(0)

    data = { app: 'Laravel' }
    expect(validator.valid()).toEqual([])

    response = precognitiveResponse({status: 200, headers: { 'precognition-success' : undefined } })
    pendingRequest = validator.validate('app', 'Laravel')
    expect(validator.valid()).toEqual([])

    await pendingRequest
    expect(validator.valid()).toEqual(['app'])
    expect(onValidatedChangedCalledTimes).toEqual(1)
})

it('can mark fields as touched', () => {
    const validator = createValidator((client) => client.post('/foo', data))

    validator.touch('name')
    expect(validator.touched()).toEqual(['name'])

    validator.touch(['foo', 'bar'])
    expect(validator.touched()).toEqual(['name', 'foo', 'bar'])
})

it('revalidates when touched changes', async () => {
    expect.assertions(2)

    let requests = 0
    axios.request.mockImplementation(() => {
        requests++

        return Promise.resolve(precognitiveResponse())
    })
    let data = { version: '10' }
    const validator = createValidator((client) => client.post('/foo', data))

    data = { app: 'Laravel' }
    await validator.validate('app', 'Laravel')
    expect(requests).toBe(1)

    vi.advanceTimersByTime(1500)
    validator.touch('version')
    await validator.validate('app', 'Laravel')
    expect(requests).toBe(2)
})

it('can validate without needing to specify a field', async () => {
    expect.assertions(1)

    let requests = 0
    axios.request.mockImplementation(() => {
        requests++

        return Promise.resolve(precognitiveResponse())
    })
    let data = { name: 'Tim', framework: 'Laravel' }
    const validator = createValidator((client) => client.post('/foo', data))

    await validator.touch(['name', 'framework']).validate()
    expect(requests).toBe(1)
})

it('marks fields as valid on precognition success', async () => {
    expect.assertions(5)

    let requests = 0
    axios.request.mockImplementation(() => {
        requests++

        return Promise.resolve(precognitiveResponse())
    })
    const validator = createValidator((client) => client.post('/foo', {}))
    let valid = null
    validator.setErrors({name: 'Required'}).touch('name').on('errorsChanged', () => {
        valid = validator.valid()
    })

    expect(validator.valid()).toStrictEqual([])
    expect(valid).toBeNull()

    await validator.validate()

    expect(requests).toBe(1)
    expect(validator.valid()).toStrictEqual(['name'])
    expect(valid).toStrictEqual(['name'])
})

it('can access the response object via the promise returned from validate', async () => {
    expect.assertions(1)

    axios.request.mockImplementation(() => Promise.resolve(precognitiveResponse({ data: 'response-data' })))
    let data
    const validator = createValidator((client) => client.post('/foo', data))

    data = { name: 'Tim' }
    const response = await validator.validate('name', 'Tim')

    expect(response.data).toBe('response-data')
})

it('cancels unresolved promises returned from the validate call when re-calling the validate function', async () => {
    expect.assertions(7)

    let requests = 0;
    axios.request.mockImplementation(() => {
        requests++

        return Promise.resolve(precognitiveResponse({ data: `response-${requests}` }))
    })
    let data
    const validator = createValidator((client) => client.post('/foo', data))

    const responses = []

    data = { name: 'Tim' }
    responses.push(validator.validate('name', 'Tim').then(() => 'first'))
    data = { name: 'Jess' }
    responses.push(validator.validate('name', 'Jess').then(() => 'second'))
    data = { name: 'Taylor' }
    responses.push(validator.validate('name', 'Taylor').then(() => 'third'))

    await responses[0].catch(reason => {
        expect(reason).toBeInstanceOf(PrecognitionError)
        expect(reason).toBeInstanceOf(IgnorablePrecognitionError)
        expect(reason.message).toBe('Another validation promise has been resolved.')
    })
    await responses[1].catch(reason => {
        expect(reason).toBeInstanceOf(PrecognitionError)
        expect(reason).toBeInstanceOf(IgnorablePrecognitionError)
        expect(reason.message).toBe('Another validation promise has been resolved.')
    })
    expect(await responses[2]).toBe('third')
})

it('calls user configured onSuccess handlers', async () => {
    expect.assertions(1)

    axios.request.mockImplementation(() => Promise.resolve(precognitiveResponse({ data: '123' })))
    const validator = createValidator((client) => client.post('/foo', {}, {
        onSuccess: (response) => response.data
    }))

    const response = await validator.validate('foo', 'bar')

    expect(response).toBe('123')
})
