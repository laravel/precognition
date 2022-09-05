import {default as Axios, AxiosError, AxiosRequestConfig, AxiosResponse, AxiosInstance} from 'axios'

type StatusHandler = (response: AxiosResponse, axiosError?: AxiosError) => unknown
type ValidationHandler = (errors: ValidationErrors, axiosError: AxiosError) => unknown
interface ValidationPayload {
    message: string,
    errors: ValidationErrors,
}

interface ValidationErrors {
    [key: string]: Array<string>,
}

type Config = AxiosRequestConfig&{
    validate?: Iterable<string>|ArrayLike<string>,
    onPrecognitionSuccess?: StatusHandler,
    onValidationError?: ValidationHandler,
    onUnauthorized?: StatusHandler,
    onForbidden?: StatusHandler,
    onNotFound?: StatusHandler,
    onConflict?: StatusHandler,
    onLocked?: StatusHandler,
}

const resolveStatusHandler = (config: Config, code: number): StatusHandler|undefined => ({
    204: config.onPrecognitionSuccess,
    401: config.onUnauthorized,
    403: config.onForbidden,
    404: config.onNotFound,
    409: config.onConflict,
    423: config.onLocked,
}[code])


const resolveConfig = (config: Config) => ({
    ...config,
    headers: {
        ...config.headers,
        Precognition: true,
        ...config.validate ? {
            'Precognition-Validate-Only': Array.from(config.validate).join(),
        } : {}
    },
})

const isValidationPayload = (response: any): response is ValidationPayload => {
    return typeof response === 'object'
       && typeof response.message === 'string'
       && typeof response.errors === 'object'
       && ! Array.isArray(response.errors)
       && Object.keys(response.errors).every(key => {
           return Array.isArray(response.errors[key])
               && response.errors[key].every((error: unknown) => typeof error === 'string')
       })
}

let customAxios: AxiosInstance|undefined;

const request = (config: Config = {}) => (customAxios ?? Axios)
    .request(resolveConfig(config))
    .then(response => {
        if (response.headers.precognition !== 'true') {
            throw Error('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.')
        }

        const statusHandler = resolveStatusHandler(config, response.status)

        return statusHandler ? statusHandler(response) : response
    }, error => {
        if (! Axios.isAxiosError(error) || Axios.isCancel(error)) {
            return Promise.reject(error)
        }

        if (error.response?.headers?.precognition !== 'true') {
            throw Error('Did not receive a Precognition response. Ensure you have the Precognition middleware in place for the route.')
        }

        if (error.response.status === 422 && config.onValidationError && isValidationPayload(error.response.data)) {
            return config.onValidationError(error.response.data.errors, error)
        }

        const statusHandler = resolveStatusHandler(config, error.response.status)

        return statusHandler ? statusHandler(error.response, error) : Promise.reject(error)
    })

const client = {
    get: (url: string, config: Config = {}) => request({ ...config, url, method: 'get' }),
    post: (url: string, data: unknown = {}, config: Config = {}) => request({ ...config, url, data, method: 'post' }),
    patch: (url: string, data: unknown = {}, config: Config = {}) => request({ ...config, url, data, method: 'patch' }),
    put: (url: string, data: unknown = {}, config: Config = {}) => request({ ...config, url, data, method: 'put' }),
    delete: (url: string, config: Config = {}) => request({ ...config, url, method: 'delete' }),
    use: (axios: AxiosInstance) => {
        customAxios = axios
        return client
    }
}

export { client as default }
