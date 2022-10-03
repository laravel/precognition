import { AxiosError, AxiosInstance, AxiosResponse, default as Axios } from 'axios'
import { Validator } from './validator'
import { Config, Client, RequestFingerprintResolver, StatusHandler, ClientCallback } from './types'

let axiosClient: AxiosInstance = Axios

let requestFingerprintResolver: RequestFingerprintResolver = (config, axios) => `${config.method}:${config.baseURL ?? axios.defaults.baseURL ?? ''}${config.url}`

const abortControllers: { [key: string]: AbortController } = {}

export const client: Client = {
    axios: () => axiosClient,
    get: (url, config = {}) => request({ ...config, url, method: 'get' }),
    post: (url, data = {}, config = {}) => request({ ...config, url, data, method: 'post' }),
    patch: (url, data = {}, config = {}) => request({ ...config, url, data, method: 'patch' }),
    put: (url, data = {}, config = {}) => request({ ...config, url, data, method: 'put' }),
    delete: (url, config = {}) => request({ ...config, url, method: 'delete' }),
    validate(callback: ClientCallback) {
        return Validator(this, callback)
    },
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
}

const request = (userConfig: Config = {}): Promise<unknown> => {
    const config = resolveConfig(userConfig)

    abortMatchingRequests(config)

    refreshAbortController(config)

    if (config.onBefore !== undefined) {
        config.onBefore()
    }

    return client.axios().request(config).then(response => {
        validatePrecognitionResponse(response)

        const statusHandler = resolveStatusHandler(config, response.status)

        return statusHandler ? statusHandler(response) : response
    }, error => {
        if (isNotServerGeneratedError(error)) {
            return Promise.reject(error)
        }

        validatePrecognitionResponse(error.response)

        const statusHandler = resolveStatusHandler(config, error.response.status)

        return statusHandler ? statusHandler(error.response, error) : Promise.reject(error)
    }).finally(() => {
        if (config.onAfter) {
            config.onAfter()
        }
    })
}

const abortMatchingRequests = (config: Config): void => {
    if (typeof config.fingerprint === 'string') {
        abortControllers[config.fingerprint]?.abort()
        delete abortControllers[config.fingerprint]
    }
}

const refreshAbortController = (config: Config): void => {
    if (
        typeof config.fingerprint === 'string'
        && config.signal === undefined
        && config.cancelToken === undefined
    ) {
        abortControllers[config.fingerprint] = new AbortController
        config.signal = abortControllers[config.fingerprint].signal
    }
}

const validatePrecognitionResponse = (response: AxiosResponse|undefined): void => {
    if (response?.headers?.precognition !== 'true') {
        throw Error('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.')
    }
}

const isNotServerGeneratedError = (error: AxiosError): boolean => {
    return ! Axios.isAxiosError(error) || Axios.isCancel(error) || typeof error.response?.status !== 'number'
}

const resolveConfig = (config: Config): Config => ({
    fingerprint: config.fingerprint === undefined
        ? requestFingerprintResolver(config, client.axios())
        : config.fingerprint,
    ...config,
    headers: {
        ...config.headers,
        Precognition: true,
        ...config.validate ? {
            'Precognition-Validate-Only': Array.from(config.validate).join(),
        } : {},
    },
})

const resolveStatusHandler = (config: Config, code: number): StatusHandler|undefined => ({
    204: config.onPrecognitionSuccess,
    401: config.onUnauthorized,
    403: config.onForbidden,
    404: config.onNotFound,
    409: config.onConflict,
    422: config.onValidationError,
    423: config.onLocked,
}[code])
