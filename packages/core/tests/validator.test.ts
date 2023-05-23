import axios from 'axios'
import { client } from '../src/index'
import { createValidator } from '../src/validator'

jest.mock('axios')
client.use(axios)
jest.useFakeTimers()

test('revalidates data when validate is called', async () => {
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
    jest.advanceTimersByTime(1500)

    data = { name: 'Jess' }
    validator.validate('name', 'Jess')
    expect(requests).toBe(2)
    jest.advanceTimersByTime(1500)

    data = { name: 'Taylor' }
    validator.validate('name', 'Taylor')
    expect(requests).toBe(3)
    jest.advanceTimersByTime(1500)
})

test('does not revalidate data when data is unchanged', async () => {
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
    jest.advanceTimersByTime(1500)

    data = { first: true }
    validator.validate('name', true)
    expect(requests).toBe(1)
    jest.advanceTimersByTime(1500)

    data = { second: true }
    validator.validate('name', true)
    expect(requests).toBe(2)
    jest.advanceTimersByTime(1500)
})

test('it marks inputs as touched when they have an error', () => {
    expect.assertions(1)

    const validator = createValidator((client) => client.post('/foo', {}), {
        name: 'Tim',
    })

    validator.setErrors({
        name: 'xxxx',
    })

    expect(validator.touched()).toEqual(['name'])
})

test('inputs remain touched if they become valid',  () => {
    expect.assertions(1)

    const validator = createValidator((client) => client.post('/foo', {}), {
        name: 'Tim',
    })

    validator.setErrors({
        name: 'xxxx',
    })
    validator.setErrors({
        //
    })
    expect(validator.touched()).toEqual(['name'])
})

test('setErrors accepts laravel formatted validation errors', () => {
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

test('setErrors accepts inertia formatted validation errors', () => {
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

test('it triggers errorsChanged event when setting errors', () => {
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

test('it doesnt trigger errorsChanged event when errors are the same', () => {
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

test('hasErrors function', () => {
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

test('is not valid before it has been validated', async () => {
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

test('it does not validate if the field has not been changed', async () => {
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

test('is valid after field has changed and successful validation has triggered', async () => {
    let requestMade = false
    let promise
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


