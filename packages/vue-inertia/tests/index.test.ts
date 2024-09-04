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

it('provides default data for validation requets', () => {
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

it('can change keys in transformation', () => {
    const response = { headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' }

    let config: Config
    axios.request.mockImplementation(async (c: Config) => {
        config = c

        return response
    })

    const form = useForm('post', '/register', {
        emailCsv: '',
    }).transform((data) => {
        console.log('transforming', data)
        return { emails: data.emailCsv.split(',').map(email => email.trim()) }
    })

    form.emailCsv = 'taylor@laravel.com, tim@laravel.com'
    form.validate('emailCsv')

    expect(config!.data.emails).toEqual(['taylor@laravel.com', 'tim@laravel.com'])
    expect(form.emails).toBe('taylor@laravel.com, tim@laravel.com')
    expect(form.data().emails).toBe('taylor@laravel.com, tim@laravel.com')
})
