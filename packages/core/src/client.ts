import { merge } from 'lodash-es'
import { Config, Client, RequestFingerprintResolver, StatusHandler, SuccessResolver, RequestMethod } from './types.js'
import { hasFiles } from './form.js'
import { HttpClient, HttpResponse, FetchClientOptions } from './http/types.js'
import { HttpResponseError } from './http/errors.js'
import { fetchHttpClient, createFetchClient } from './http/fetchClient.js'

/**
 * The configured HTTP client.
 */
let httpClient: HttpClient = fetchHttpClient

/**
 * The configured base URL.
 */
let baseURL: string | undefined = undefined

/**
 * The configured default timeout.
 */
let timeout: number | undefined = undefined

/**
 * The configured credentials mode.
 */
let credentials: RequestCredentials = 'same-origin'

/**
 * The configured XSRF cookie name.
 */
let xsrfCookieName: string | undefined = undefined

/**
 * The configured XSRF header name.
 */
let xsrfHeaderName: string | undefined = undefined

/**
 * The request fingerprint resolver.
 */
let requestFingerprintResolver: RequestFingerprintResolver = (config) => `${config.method}:${config.baseURL ?? baseURL ?? ''}${config.url}`

/**
 * The precognition success resolver.
 */
let successResolver: SuccessResolver = (response: HttpResponse) => response.status === 204 && response.headers['precognition-success'] === 'true'

/**
 * The abort controller cache.
 */
const abortControllers: Record<string, AbortController> = {}

/**
 * The precognitive HTTP client instance.
 */
export const client: Client = {
    get: (url, data = {}, config = {}) => request(mergeConfig('get', url, data, config)),
    post: (url, data = {}, config = {}) => request(mergeConfig('post', url, data, config)),
    patch: (url, data = {}, config = {}) => request(mergeConfig('patch', url, data, config)),
    put: (url, data = {}, config = {}) => request(mergeConfig('put', url, data, config)),
    delete: (url, data = {}, config = {}) => request(mergeConfig('delete', url, data, config)),
    useHttpClient(newHttpClient) {
        httpClient = newHttpClient

        return client
    },
    withBaseURL(url) {
        baseURL = url

        return client
    },
    withTimeout(duration) {
        timeout = duration

        return client
    },
    withCredentials(value) {
        credentials = typeof value === 'string' ? value : (value ? 'include' : 'omit')

        return client
    },
    fingerprintRequestsUsing(callback) {
        requestFingerprintResolver = callback === null
            ? () => null
            : callback

        return client
    },
    determineSuccessUsing(callback) {
        successResolver = callback

        return client
    },
    withXsrfCookieName(name) {
        xsrfCookieName = name
        httpClient = createFetchClient({ xsrfCookieName, xsrfHeaderName })

        return client
    },
    withXsrfHeaderName(name) {
        xsrfHeaderName = name
        httpClient = createFetchClient({ xsrfCookieName, xsrfHeaderName })

        return client
    },
}

/**
 * Merge the client specified arguments with the provided configuration.
 */
const mergeConfig = (method: RequestMethod, url: string, data?: Record<string, unknown>, config?: Config) => ({
    url,
    method,
    ...config,
    ...(['get', 'delete'].includes(method) ? {
        params: merge({}, data, config?.params),
    } : {
        data: merge({}, data, config?.data),
    }),
})

/**
 * Send and handle a new request.
 */
const request = (userConfig: Config = {}): Promise<unknown> => {
    const config = [
        resolveConfig,
        abortMatchingRequests,
        refreshAbortController,
    ].reduce((config, callback) => callback(config), userConfig)

    if ((config.onBefore ?? (() => true))() === false) {
        return Promise.resolve(null)
    }

    (config.onStart ?? (() => null))()

    return httpClient.request({
        method: config.method!,
        url: config.url!,
        baseURL: config.baseURL ?? baseURL,
        data: config.data,
        params: config.params,
        headers: config.headers as Record<string, string>,
        signal: config.signal,
        timeout: config.timeout,
        credentials,
    }).then(async (response) => {
        if (config.precognitive) {
            validatePrecognitionResponse(response)
        }

        const status = response.status

        let payload: unknown = response

        if (config.precognitive && config.onPrecognitionSuccess && successResolver(response)) {
            payload = await Promise.resolve(config.onPrecognitionSuccess(response) ?? payload)
        }

        if (config.onSuccess && isSuccess(status)) {
            payload = await Promise.resolve(config.onSuccess(payload as HttpResponse) ?? payload)
        }

        const statusHandler = resolveStatusHandler(config, status)
            ?? ((response) => response)

        return statusHandler(payload as HttpResponse) ?? payload
    }, (error) => {
        if (isNotServerGeneratedError(error)) {
            return Promise.reject(error)
        }

        const httpError = error as HttpResponseError

        if (config.precognitive) {
            validatePrecognitionResponse(httpError.response)
        }

        const statusHandler = resolveStatusHandler(config, httpError.response.status)
            ?? ((_, error) => Promise.reject(error))

        return statusHandler(httpError.response, httpError)
    }).finally(config.onFinish ?? (() => null))
}

/**
 * Resolve the configuration.
 */
const resolveConfig = (config: Config): Config => {
    const only = config.only ?? config.validate

    return {
        ...config,
        timeout: config.timeout ?? timeout,
        precognitive: config.precognitive !== false,
        fingerprint: typeof config.fingerprint === 'undefined'
            ? requestFingerprintResolver(config, httpClient)
            : config.fingerprint,
        headers: {
            ...config.headers,
            'Content-Type': resolveContentType(config),
            ...config.precognitive !== false ? {
                Precognition: true,
            } : {},
            ...only ? {
                'Precognition-Validate-Only': Array.from(only).join(),
            } : {},
        },
    }
}

/**
 * Determine if the status is successful.
 */
const isSuccess = (status: number) => status >= 200 && status < 300

/**
 * Abort an existing request with the same configured fingerprint.
 */
const abortMatchingRequests = (config: Config): Config => {
    if (typeof config.fingerprint !== 'string') {
        return config
    }

    abortControllers[config.fingerprint]?.abort()

    delete abortControllers[config.fingerprint]

    return config
}

/**
 * Create and configure the abort controller for a new request.
 */
const refreshAbortController = (config: Config): Config => {
    if (
        typeof config.fingerprint !== 'string'
        || config.signal
        || ! config.precognitive
    ) {
        return config
    }

    abortControllers[config.fingerprint] = new AbortController

    return {
        ...config,
        signal: abortControllers[config.fingerprint].signal,
    }
}

/**
 * Ensure that the response is a Precognition response.
 */
const validatePrecognitionResponse = (response: HttpResponse): void => {
    if (response.headers?.precognition !== 'true') {
        throw Error('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.')
    }
}

/**
 * Determine if the error was not triggered by a server response.
 */
const isNotServerGeneratedError = (error: unknown): boolean => {
    return !(error instanceof HttpResponseError) || typeof error.response?.status !== 'number'
}

/**
 * Resolve the handler for the given HTTP response status.
 */
const resolveStatusHandler = (config: Config, code: number): StatusHandler | undefined => ({
    401: config.onUnauthorized,
    403: config.onForbidden,
    404: config.onNotFound,
    409: config.onConflict,
    422: config.onValidationError,
    423: config.onLocked,
}[code])

/**
 * Resolve the request's "Content-Type" header.
 */
const resolveContentType = (config: Config): string => (config.headers?.['Content-Type']
    ?? config.headers?.['Content-type']
    ?? config.headers?.['content-type']
    ?? (hasFiles(config.data) ? 'multipart/form-data' : 'application/json')) as string

/**
 * Resolve the url from a potential callback.
 */
export const resolveUrl = (url: string | (() => string)): string => typeof url === 'string'
    ? url
    : url()

/**
 * Resolve the method from a potential callback.
 */
export const resolveMethod = (method: RequestMethod | (() => RequestMethod)): RequestMethod => typeof method === 'string'
    ? method.toLowerCase() as RequestMethod
    : method()
