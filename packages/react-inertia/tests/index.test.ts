import { it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
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
    const { result: form } = renderHook(() => useForm('post', '/register', {
        name: '',
    }))

    act(() => form.current.setErrors({
        name: 'xxxx',
        other: 'xxxx',
    }))

    expect(form.current.errors).toEqual({
        name: 'xxxx',
        other: 'xxxx',
    })

    act(() => form.current.clearErrors())

    expect(form.current.errors).toEqual({})
    expect(form.current.validator().errors()).toEqual({})
})

it('can clear specific errors via Inertia\'s clearErrors', () => {
    const { result: form } = renderHook(() => useForm('post', '/register', {
        name: '',
    }))

    act(() => form.current.setErrors({
        name: 'xxxx',
        email: 'xxxx',
        other: 'xxxx',
    }))

    expect(form.current.errors).toEqual({
        name: 'xxxx',
        email: 'xxxx',
        other: 'xxxx',
    })

    act(() => form.current.clearErrors('name', 'email'))

    expect(form.current.errors).toEqual({
        other: 'xxxx',
    })
    expect(form.current.validator().errors()).toEqual({
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

    const { result: form } = renderHook(() => useForm('post', '/register', {
        emails: '',
    }))

    act(() => form.current.setData('emails', 'taylor@laravel.com, tim@laravel.com'))
    act(() => form.current.validate('emails'))

    expect(config!.data.emails).toEqual('taylor@laravel.com, tim@laravel.com')
    expect(form.current.data.emails).toBe('taylor@laravel.com, tim@laravel.com')
})

it('transforms data for validation requests', () => {
    const response = { headers: { precognition: 'true', 'precognition-success': 'true' }, status: 204, data: 'data' }

    let config: Config
    axios.request.mockImplementation(async (c: Config) => {
        config = c

        return response
    })

    const { result: form } = renderHook(() => useForm('post', '/register', {
        emails: '',
    }))

    act(() => form.current.transform((data) => ({
        emails: data.emails.split(',').map((email: string) => email.trim()),
    })))

    act(() => form.current.setData('emails', 'taylor@laravel.com, tim@laravel.com'))
    act(() => form.current.validate('emails'))

    expect(config!.data.emails).toEqual(['taylor@laravel.com', 'tim@laravel.com'])
    expect(form.current.data.emails).toBe('taylor@laravel.com, tim@laravel.com')
})

it('can set individual errors', function () {
    const { result: form } = renderHook(() => useForm('post', '/register', {
        name: '',
    }))

    act(() => form.current.setError('name', 'The name is required.'))

    expect(form.current.errors.name).toBe('The name is required.')
})

it('can check that specific fields have been touched', () => {
    const { result: form } = renderHook(() => useForm('post', '/register', {
        name: '',
        email: '',
    }))

    expect(form.current.touched('name')).toBe(false)
    expect(form.current.touched('email')).toBe(false)

    act(() => form.current.touch('name'))

    expect(form.current.touched('name')).toBe(true)
    expect(form.current.touched('email')).toBe(false)
})

it('can check it any fields have been touched', () => {
    const { result: form } = renderHook(() => useForm('post', '/register', {
        name: '',
        email: '',
    }))

    expect(form.current.touched()).toBe(false)

    act(() => form.current.touch('name'))

    expect(form.current.touched()).toBe(true)
})

it('can set defaults with no arguments', () => {
    let requests = 0
    axios.request.mockImplementation(async () => {
        requests++
    })

    const { result: form } = renderHook(() => useForm('post', '/register', {
        name: 'John',
    }))

    act(() => form.current.setData('name', 'Jane'))
    act(() => form.current.setDefaults())

    act(() => form.current.setData('name', 'John'))
    act(() => form.current.reset())
    expect(form.current.data.name).toBe('Jane')

    act(() => form.current.validate('name'))
    expect(requests).toBe(0)
})

it('can set defaults with an object', () => {
    let requests = 0
    axios.request.mockImplementation(async () => {
        requests++
    })

    const { result: form } = renderHook(() => useForm('post', '/register', {
        name: 'John',
    }))

    act(() => form.current.setDefaults({ name: 'Jane' }))

    act(() => form.current.setData('name', 'John'))
    act(() => form.current.reset())
    expect(form.current.data.name).toBe('Jane')

    act(() => form.current.validate('name'))
    expect(requests).toBe(0)
})

it('can set defaults with a function', () => {
    let requests = 0
    axios.request.mockImplementation(async () => {
        requests++
    })

    const { result: form } = renderHook(() => useForm('post', '/register', {
        name: 'John',
    }))

    act(() => form.current.setDefaults((prevData: any) => {
        expect(prevData).toEqual({
            name: 'John',
        })

        return {
            name: 'Jane',
        }
    }))

    act(() => form.current.setData('name', 'John'))
    act(() => form.current.reset())
    expect(form.current.data.name).toBe('Jane')

    act(() => form.current.validate('name'))
    expect(requests).toBe(0)
})

it('can set defaults with a field and value', () => {
    let requests = 0
    axios.request.mockImplementation(async () => {
        requests++
    })

    const { result: form } = renderHook(() => useForm('post', '/register', {
        name: 'John',
    }))

    act(() => form.current.setDefaults('name', 'Jane'))

    act(() => form.current.setData('name', 'John'))
    act(() => form.current.reset())
    expect(form.current.data.name).toBe('Jane')

    act(() => form.current.validate('name'))
    expect(requests).toBe(0)
})
