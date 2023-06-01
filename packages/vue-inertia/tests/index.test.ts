import { it, expect } from 'vitest'
import { useForm } from '../src/index'

it("can clear all errors via Inertia's clearErrors", () => {
    const form = useForm('post', '/register', {
        name: ''
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

it("can clear specific errors via Inertia's clearErrors", () => {
    const form = useForm('post', '/register', {
        name: ''
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
        other: 'xxxx'
    })
    expect(form.validator().errors()).toEqual({
        other: ['xxxx']
    })
})
