import { default as Axios, AxiosInstance } from 'axios'
import { Poll } from './poll'
import { Validator } from './validator'
import { Config, Client, RequestFingerprintResolver, StatusHandler, ClientCallback } from './types'

let axiosClient: AxiosInstance = Axios

let requestFingerprintResolver: RequestFingerprintResolver = (config, axios) => `${config.method}:${config.baseURL ?? axios.defaults.baseURL ?? ''}${config.url}`

const abortControllers: { [key: string]: AbortController } = {}

export const client: Client = {
    get: (url, config = {}) => request({ ...config, url, method: 'get' }),
    post: (url, data = {}, config = {}) => request({ ...config, url, data, method: 'post' }),
    patch: (url, data = {}, config = {}) => request({ ...config, url, data, method: 'patch' }),
    put: (url, data = {}, config = {}) => request({ ...config, url, data, method: 'put' }),
    delete: (url, config = {}) => request({ ...config, url, method: 'delete' }),
    poll(callback: ClientCallback) {
        return Poll(() => callback(this))
    },
    validate(callback: ClientCallback) {
        return Validator(this, callback)
    },
    use(axios) {
        axiosClient = axios
        return this
    },
    fingerprintRequestsUsing(callback) {
        requestFingerprintResolver = callback === null ? () => null : callback

        return this
    },
}

const request = (userConfig: Config = {}): Promise<unknown> => {
    const config = resolveConfig(userConfig)

    if (
        typeof config.fingerprint === 'string'
        && config.signal === undefined
        && config.cancelToken === undefined
    ) {
        abortControllers[config.fingerprint]?.abort()
        abortControllers[config.fingerprint] = new AbortController
        config.signal = abortControllers[config.fingerprint].signal
    }

    if (config.before !== undefined) {
        config.before()
    }

    return axiosClient.request(config).then(response => {
        if (response.headers.precognition !== 'true') {
            throw Error('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.')
        }

        const statusHandler = resolveStatusHandler(config, response.status)

        return statusHandler ? statusHandler(response) : response
    }, error => {
        if (! Axios.isAxiosError(error) || Axios.isCancel(error) || typeof error.response?.status !== 'number') {
            return Promise.reject(error)
        }

        if (error.response?.headers?.precognition !== 'true') {
            throw Error('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.')
        }

        if (error.response.status === 422 && config.onValidationError) {
            return config.onValidationError(
                // @ts-ignore-next-line
                error.response.data?.errors,
                error
            )
        }

        const statusHandler = resolveStatusHandler(config, error.response.status)

        return statusHandler ? statusHandler(error.response, error) : Promise.reject(error)
    })
}

const resolveConfig = (config: Config): Config => ({
    fingerprint: config.fingerprint === undefined
        ? requestFingerprintResolver(config, axiosClient)
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
    423: config.onLocked,
}[code])
