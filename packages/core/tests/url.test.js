import { it, expect, describe } from 'vitest'
import { buildUrl, buildQueryString } from '../src/http/url'

describe('buildQueryString', () => {
    it('builds query string from simple params', () => {
        const result = buildQueryString({ page: 1, limit: 10 })
        expect(result).toBe('page=1&limit=10')
    })

    it('handles string values', () => {
        const result = buildQueryString({ search: 'hello world' })
        expect(result).toBe('search=hello+world')
    })

    it('handles array values with bracket notation', () => {
        const result = buildQueryString({ ids: [1, 2, 3] })
        expect(result).toContain('ids%5B%5D=1')
        expect(result).toContain('ids%5B%5D=2')
        expect(result).toContain('ids%5B%5D=3')
    })

    it('handles nested objects as JSON', () => {
        const result = buildQueryString({ filter: { status: 'active' } })
        expect(result).toBe('filter=%7B%22status%22%3A%22active%22%7D')
    })

    it('skips null and undefined values', () => {
        const result = buildQueryString({ a: 1, b: null, c: undefined, d: 2 })
        expect(result).toBe('a=1&d=2')
    })

    it('returns empty string for empty params', () => {
        const result = buildQueryString({})
        expect(result).toBe('')
    })
})

describe('buildUrl', () => {
    it('returns url as-is when no base URL', () => {
        const result = buildUrl('https://laravel.com/api/users')
        expect(result).toBe('https://laravel.com/api/users')
    })

    it('joins base URL and path', () => {
        const result = buildUrl('/api/users', 'https://laravel.com')
        expect(result).toBe('https://laravel.com/api/users')
    })

    it('handles trailing slash on base URL', () => {
        const result = buildUrl('/api/users', 'https://laravel.com/')
        expect(result).toBe('https://laravel.com/api/users')
    })

    it('handles no leading slash on path', () => {
        const result = buildUrl('api/users', 'https://laravel.com')
        expect(result).toBe('https://laravel.com/api/users')
    })

    it('preserves base URL path', () => {
        const result = buildUrl('/users', 'https://laravel.com/api/v1')
        expect(result).toBe('https://laravel.com/api/v1/users')
    })

    it('does not use base URL for absolute URLs', () => {
        const result = buildUrl('https://other.com/api', 'https://laravel.com')
        expect(result).toBe('https://other.com/api')
    })

    it('appends query params', () => {
        const result = buildUrl('/api/users', 'https://laravel.com', { page: 1 })
        expect(result).toBe('https://laravel.com/api/users?page=1')
    })

    it('appends to existing query string', () => {
        const result = buildUrl('/api/users?sort=name', 'https://laravel.com', { page: 1 })
        expect(result).toBe('https://laravel.com/api/users?sort=name&page=1')
    })

    it('handles empty params object', () => {
        const result = buildUrl('/api/users', 'https://laravel.com', {})
        expect(result).toBe('https://laravel.com/api/users')
    })
})
