import { HttpClient, HttpRequestConfig, HttpResponse } from './types.js'
import { HttpResponseError, HttpCancelledError, HttpNetworkError } from './errors.js'
import { buildUrl } from './url.js'
import { hasFiles } from '../form.js'

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
 * Get the X-Requested-With header from Laravel's bootstrap config if available.
 */
function getAjaxHeader(): string | null {
    if (typeof window === 'undefined') {
        return null
    }

    return (window as any).axios?.defaults?.headers?.common?.['X-Requested-With'] ?? null
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
export function createFetchClient(): HttpClient {
    return {
        async request(config: HttpRequestConfig): Promise<HttpResponse> {
            const url = buildUrl(config.url, config.baseURL, config.params)
            const method = config.method.toUpperCase()

            const headers: Record<string, string> = {}

            // Inherit X-Requested-With from Laravel's bootstrap config if available
            const ajaxHeader = getAjaxHeader()

            if (ajaxHeader) {
                headers['X-Requested-With'] = ajaxHeader
            }

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
            const timeout = config.timeout ?? 30000

            if (timeout > 0 && !signal) {
                const controller = new AbortController()

                signal = controller.signal
                timeoutId = setTimeout(() => controller.abort(), timeout)
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
                    credentials: config.credentials ?? 'same-origin',
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
