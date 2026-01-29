import { HttpClient, HttpRequestConfig, HttpResponse } from './types.js'
import { HttpResponseError, HttpCancelledError, HttpNetworkError } from './errors.js'
import { hasFiles } from '../form.js'

export interface FetchClientOptions {
    baseURL?: string
}

/**
 * Read the XSRF token from cookies.
 */
function getXsrfToken(): string | null {
    if (typeof document === 'undefined') {
        return null
    }

    const match = document.cookie.match(new RegExp('(^|;\\s*)XSRF-TOKEN=([^;]*)'))

    return match ? decodeURIComponent(match[2]) : null
}

/**
 * Build a query string from params.
 */
function buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) {
            return
        }

        if (Array.isArray(value)) {
            value.forEach((item) => searchParams.append(`${key}[]`, String(item)))
        } else if (typeof value === 'object') {
            searchParams.append(key, JSON.stringify(value))
        } else {
            searchParams.append(key, String(value))
        }
    })

    return searchParams.toString()
}

/**
 * Build the full URL with base URL and query params.
 */
function buildUrl(config: HttpRequestConfig, baseURL?: string): string {
    let url = config.url

    const effectiveBaseURL = config.baseURL ?? baseURL

    if (effectiveBaseURL && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = effectiveBaseURL.replace(/\/$/, '') + '/' + url.replace(/^\//, '')
    }

    if (config.params && Object.keys(config.params).length > 0) {
        const queryString = buildQueryString(config.params)

        if (queryString) {
            url += (url.includes('?') ? '&' : '?') + queryString
        }
    }

    return url
}

/**
 * Convert data to FormData recursively.
 */
function toFormData(data: Record<string, unknown>, formData: FormData = new FormData(), parentKey: string | null = null): FormData {
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            appendToFormData(formData, parentKey ? `${parentKey}[${key}]` : key, data[key])
        }
    }

    return formData
}

function appendToFormData(formData: FormData, key: string, value: unknown): void {
    if (Array.isArray(value)) {
        return value.forEach((val, index) => appendToFormData(formData, `${key}[${index}]`, val))
    } else if (value instanceof Date) {
        return formData.append(key, value.toISOString())
    } else if (typeof File !== 'undefined' && value instanceof File) {
        return formData.append(key, value, value.name)
    } else if (value instanceof Blob) {
        return formData.append(key, value)
    } else if (typeof value === 'boolean') {
        return formData.append(key, value ? '1' : '0')
    } else if (typeof value === 'string') {
        return formData.append(key, value)
    } else if (typeof value === 'number') {
        return formData.append(key, `${value}`)
    } else if (value === null || value === undefined) {
        return formData.append(key, '')
    }

    toFormData(value as Record<string, unknown>, formData, key)
}

/**
 * Prepare the request body.
 */
function prepareBody(data: unknown, headers: Record<string, string>): BodyInit | undefined {
    if (data === undefined || data === null) {
        return undefined
    }

    if (data instanceof FormData) {
        return data
    }

    if (typeof data === 'object' && hasFiles(data)) {
        return toFormData(data as Record<string, unknown>)
    }

    if (typeof data === 'object' || headers['Content-Type']?.includes('application/json')) {
        return JSON.stringify(data)
    }

    return String(data)
}

/**
 * Parse response headers into a plain object.
 */
function parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {}

    headers.forEach((value, key) => {
        result[key.toLowerCase()] = value
    })

    return result
}

/**
 * Create a fetch-based HTTP client.
 */
export function createFetchClient(options: FetchClientOptions = {}): HttpClient {
    return {
        async request(config: HttpRequestConfig): Promise<HttpResponse> {
            const url = buildUrl(config, options.baseURL)
            const method = config.method.toUpperCase()

            const headers: Record<string, string> = {}

            // Set default Content-Type for non-GET/DELETE requests with data
            if (config.data !== undefined && !['GET', 'DELETE'].includes(method)) {
                if (!(config.data instanceof FormData) && !hasFiles(config.data)) {
                    headers['Content-Type'] = 'application/json'
                }
            }

            // Copy user headers
            if (config.headers) {
                Object.entries(config.headers).forEach(([key, value]) => {
                    if (value !== undefined) {
                        headers[key] = String(value)
                    }
                })
            }

            // Add XSRF token
            const xsrfToken = getXsrfToken()

            if (xsrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
                headers['X-XSRF-TOKEN'] = xsrfToken
            }

            // Handle timeout
            let signal = config.signal
            let timeoutId: ReturnType<typeof setTimeout> | undefined

            if (config.timeout && config.timeout > 0 && !signal) {
                const controller = new AbortController()

                signal = controller.signal
                timeoutId = setTimeout(() => controller.abort(), config.timeout)
            }

            // Prepare body (only for non-GET/DELETE requests)
            const body = ['GET', 'DELETE'].includes(method)
                ? undefined
                : prepareBody(config.data, headers)

            if (body instanceof FormData) {
                delete headers['Content-Type']
            }

            try {
                const response = await fetch(url, {
                    method,
                    headers,
                    body,
                    signal,
                    credentials: 'same-origin',
                })

                if (timeoutId) {
                    clearTimeout(timeoutId)
                }

                let data: unknown

                const contentType = response.headers.get('content-type')

                if (contentType?.includes('application/json')) {
                    data = await response.json()
                } else {
                    data = await response.text()
                }

                const httpResponse: HttpResponse = {
                    status: response.status,
                    data,
                    headers: parseHeaders(response.headers),
                }

                if (!response.ok) {
                    throw new HttpResponseError(httpResponse)
                }

                return httpResponse
            } catch (error) {
                if (timeoutId) {
                    clearTimeout(timeoutId)
                }

                if (error instanceof HttpResponseError) {
                    throw error
                }

                if (error instanceof DOMException && error.name === 'AbortError') {
                    throw new HttpCancelledError()
                }

                if (error instanceof TypeError) {
                    throw new HttpNetworkError(error.message)
                }

                throw error
            }
        },
    }
}

/**
 * Default fetch HTTP client instance.
 */
export const fetchHttpClient: HttpClient = createFetchClient()
