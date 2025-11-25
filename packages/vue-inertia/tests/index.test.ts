import { it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useForm, client } from '../src/index'
import axios from 'axios'
import { Config } from 'laravel-precognition'

beforeEach(() => {
    vi.mock('axios')
    client.use(axios)
})

afterEach(() => {
    vi.restoreAllMocks()
})

it('can clear all errors via Inertia\'s clearErrors', () => {
    const form = useForm('post', '/register', {
        name: '',
    }).setErrors({
        name: 'xxxx',
        other: 'xxxx',
    })

    expect(form.errors).toEqual({
        name: 'xxxx',
        other: 'xxxx',
    })

    form.clearErrors()

    expect(form.errors).toEqual({})
    expect(form.validator().errors()).toEqual({})
})

it('can clear specific errors via Inertia\'s clearErrors', () => {
    const form = useForm('post', '/register', {
        name: '',
    }).setErrors({
        name: 'xxxx',
        email: 'xxxx',
        other: 'xxxx',
    })

    expect(form.errors).toEqual({
        name: 'xxxx',
        email: 'xxxx',
        other: 'xxxx',
    })

    form.clearErrors('name', 'email')

    expect(form.errors).toEqual({
        other: 'xxxx',
    })
    expect(form.validator().errors()).toEqual({
        other: ['xxxx'],
    })
})

it('provides default data for validation requests', () => {
    const response = { headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' }

    let config: Config
    axios.request.mockImplementation(async (c: Config) => {
        config = c

        return response
    })

    const form = useForm('post', '/register', {
        emails: '',
    })

    form.emails = 'taylor@laravel.com, tim@laravel.com'
    form.validate('emails')

    expect(config!.data.emails).toEqual('taylor@laravel.com, tim@laravel.com')
    expect(form.emails).toBe('taylor@laravel.com, tim@laravel.com')
    expect(form.data().emails).toBe('taylor@laravel.com, tim@laravel.com')
})

it('transforms data for validation requests', () => {
    const response = { headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' }

    let config: Config
    axios.request.mockImplementation(async (c: Config) => {
        config = c

        return response
    })

    const form = useForm('post', '/register', {
        emails: '',
    }).transform((data) => ({
        emails: data.emails.split(',').map((email) => email.trim()),
    }))

    form.emails = 'taylor@laravel.com, tim@laravel.com'
    form.validate('emails')

    expect(config!.data.emails).toEqual(['taylor@laravel.com', 'tim@laravel.com'])
    expect(form.emails).toBe('taylor@laravel.com, tim@laravel.com')
    expect(form.data().emails).toBe('taylor@laravel.com, tim@laravel.com')
})

it('can set individual errors', function () {
    const form = useForm('post', '/register', {
        name: '',
    })

    form.setError('name', 'The name is required.')

    expect(form.errors.name).toBe('The name is required.')
})

it('allows getter as data inputs', function () {
    let dynamicEmail = 'taylor@laravel.com'

    function getData() {
        return {
            email: dynamicEmail,
        }
    }

    const form = useForm('post', '/register', getData)

    expect(form.email).toBe('taylor@laravel.com')

    dynamicEmail = 'tim@laravel.com'
    form.reset()

    expect(form.email).toBe('tim@laravel.com')
})

it('can check that specific fields have been touched', () => {
    const form = useForm('post', '/register', {
        name: '',
        email: '',
    })

    expect(form.touched('name')).toBe(false)
    expect(form.touched('email')).toBe(false)

    form.touch('name')

    expect(form.touched('name')).toBe(true)
    expect(form.touched('email')).toBe(false)
})

it('can check it any fields have been touched', () => {
    const form = useForm('post', '/register', {
        name: '',
        email: '',
    })

    expect(form.touched()).toBe(false)

    form.touch('name')

    expect(form.touched()).toBe(true)
})

it('can set defaults with no arguments', () => {
    let requests = 0
    axios.request.mockImplementation(async () => {
        requests++
    })

    const form = useForm('post', '/register', {
        name: 'John',
    })

    form.name = 'Jane'
    form.defaults()

    form.name = 'John'
    form.reset()
    expect(form.name).toBe('Jane')

    form.validate('name')
    expect(requests).toBe(0)
})

it('can set defaults with an object', () => {
    let requests = 0
    axios.request.mockImplementation(async () => {
        requests++
    })

    const form = useForm('post', '/register', {
        name: 'John',
    })

    form.defaults({ name: 'Jane' })

    form.name = 'John'
    form.reset()
    expect(form.name).toBe('Jane')

    form.validate('name')
    expect(requests).toBe(0)
})

it('can set defaults with a function', () => {
    let requests = 0
    axios.request.mockImplementation(async () => {
        requests++
    })

    const form = useForm('post', '/register', {
        name: 'John',
    })

    form.defaults((prevData: any) => {
        expect(prevData).toEqual({
            name: 'John',
        })

        return {
            name: 'Jane',
        }
    })

    form.name = 'John'
    form.reset()
    expect(form.name).toBe('Jane')

    form.validate('name')
    expect(requests).toBe(0)
})

it('can set defaults with a field and value', () => {
    let requests = 0
    axios.request.mockImplementation(async () => {
        requests++
    })

    const form = useForm('post', '/register', {
        name: 'John',
    })

    form.defaults('name', 'Jane')

    form.name = 'John'
    form.reset()
    expect(form.name).toBe('Jane')

    form.validate('name')
    expect(requests).toBe(0)
})
