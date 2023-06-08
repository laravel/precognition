import { it, vi, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { createValidator } from '../src/validator'

beforeEach(() => {
    vi.mock('axios')
    vi.useFakeTimers()
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.runAllTimers()
})

it('revalidates data when validate is called', async () => {
    expect.assertions(4)

    let requests = 0
    axios.request.mockImplementation(() => {
        requests++

        return Promise.resolve({ headers: { precognition: 'true' } })
    })
    let data
    const validator = createValidator((client) => client.post('/foo', data))

    expect(requests).toBe(0)

    data = { name: 'Tim' }
    validator.validate('name', 'Tim')
    expect(requests).toBe(1)
    vi.advanceTimersByTime(1500)

    data = { name: 'Jess' }
    validator.validate('name', 'Jess')
    expect(requests).toBe(2)
    vi.advanceTimersByTime(1500)

    data = { name: 'Taylor' }
    validator.validate('name', 'Taylor')
    expect(requests).toBe(3)
    vi.advanceTimersByTime(1500)
})

it('does not revalidate data when data is unchanged', async () => {
    expect.assertions(4)

    let requests = 0
    axios.request.mockImplementation(() => {
        requests++

        return Promise.resolve({ headers: { precognition: 'true' } })
    })
    let data = {}
    const validator = createValidator((client) => client.post('/foo', data))

    expect(requests).toBe(0)

    data = { first: true }
    validator.validate('name', true)
    expect(requests).toBe(1)
    vi.advanceTimersByTime(1500)

    data = { first: true }
    validator.validate('name', true)
    expect(requests).toBe(1)
    vi.advanceTimersByTime(1500)

    data = { second: true }
    validator.validate('name', true)
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
    let requestMade = false
    axios.request.mockImplementation(() => {
        requestMade = true
        return Promise.resolve({
            status: 201,
            headers: { precognition: 'true' },
            data: {},
        })
    })
    const validator = createValidator((client) => client.post('/foo', {}), {
        name: 'Tim',
    })

    validator.validate('name', 'Tim')

    expect(requestMade).toBe(false)
})

it('is valid after field has changed and successful validation has triggered', async () => {
    let requestMade = false
    let promise = Promise.resolve(null)
    axios.request.mockImplementation(() => {
        requestMade = true
        return promise = Promise.resolve({
            status: 201,
            headers: { precognition: 'true' },
            data: {},
        })
    })
    const validator = createValidator((client) => client.post('/foo', {}), {
        name: 'Tim',
    })

    validator.validate('name', 'Taylor')
    await promise

    expect(requestMade).toBe(true)
    expect(validator.valid()).toEqual(['name'])
})

it('filters out files', () => {
    let config
    axios.request.mockImplementationOnce((c) => {
        config = c
        return Promise.resolve({ headers: { precognition: 'true' } })
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

    validator.validate('text', 'Tim')

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
