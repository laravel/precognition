import { isAxiosError, isCancel, AxiosInstance, AxiosResponse, default as Axios } from 'axios'
import merge from 'lodash.merge'
import { Config, Client, RequestFingerprintResolver, StatusHandler, SuccessResolver } from './types'

/**
 * The configured axios client.
 */
let axiosClient: AxiosInstance = Axios

/**
 * The request fingerprint resolver.
 */
let requestFingerprintResolver: RequestFingerprintResolver = (config, axios) => `${config.method}:${config.baseURL ?? axios.defaults.baseURL ?? ''}${config.url}`

/**
 * The precognition success resolver.
 */
let successResolver: SuccessResolver = (response: AxiosResponse) => response.status === 204

/**
 * The abort controller cache.
 */
const abortControllers: Record<string, AbortController> = {}

/**
 * The precognitive HTTP client instance.
 */
export const client: Client = {
    get: (url, data = {}, config = {}) => request({ ...config, params: merge(config.params, data), url, method: 'get' }),
    post: (url, data = {}, config = {}) => request({ ...config, url, data, method: 'post' }),
    patch: (url, data = {}, config = {}) => request({ ...config, url, data, method: 'patch' }),
    put: (url, data = {}, config = {}) => request({ ...config, url, data, method: 'put' }),
    delete: (url, data = {}, config = {}) => request({ ...config, url, params: merge(config.params, data), method: 'delete' }),
    use(client) {
        axiosClient = client

        return this
    },
    fingerprintRequestsUsing(callback) {
        requestFingerprintResolver = callback === null
            ? () => null
            : callback

        return this
    },
    determineSuccessUsing(callback) {
        successResolver = callback

        return this
    },
}

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

    return axiosClient.request(config).then(response => {
        if (config.precognitive) {
            validatePrecognitionResponse(response)
        }

        if (config.precognitive && config.onPrecognitionSuccess && successResolver(response)) {
            return config.onPrecognitionSuccess(response)
        }

        const statusHandler = resolveStatusHandler(config, response.status)
            ?? ((response) => response)

        return statusHandler(response)
    }, error => {
        if (isNotServerGeneratedError(error)) {
            return Promise.reject(error)
        }

        if (config.precognitive) {
            validatePrecognitionResponse(error.response)
        }

        const statusHandler = resolveStatusHandler(config, error.response.status)
            ?? ((_, error) => Promise.reject(error))

        return statusHandler(error.response, error)
    }).finally(config.onFinish ?? (() => null))
}

/**
 * Resolve the configuration.
 */
const resolveConfig = (config: Config): Config => ({
    ...config,
    timeout: config.timeout ?? axiosClient.defaults['timeout'] ?? 30000,
    precognitive: config.precognitive !== false,
    fingerprint: typeof config.fingerprint === 'undefined'
        ? requestFingerprintResolver(config, axiosClient)
        : config.fingerprint,
    headers: {
        ...config.headers,
        ...config.precognitive !== false ? {
            Precognition: true,
        } : {},
        ...config.validate ? {
            'Precognition-Validate-Only': Array.from(config.validate).join(),
        } : {},
    },
})

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
        || config.cancelToken
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
const validatePrecognitionResponse = (response: AxiosResponse): void => {
    if (response.headers?.precognition !== 'true') {
        throw Error('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.')
    }
}

/**
 * Determine if the error was not triggered by a server response.
 */
const isNotServerGeneratedError = (error: unknown): boolean => {
    return ! isAxiosError(error) || typeof error.response?.status !== 'number' || isCancel(error)
}

/**
 * Resolve the handler for the given HTTP response status.
 */
const resolveStatusHandler = (config: Config, code: number): StatusHandler|undefined => ({
    401: config.onUnauthorized,
    403: config.onForbidden,
    404: config.onNotFound,
    409: config.onConflict,
    422: config.onValidationError,
    423: config.onLocked,
}[code])
