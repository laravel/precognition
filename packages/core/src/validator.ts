import debounce from 'lodash.debounce'
import isequal from 'lodash.isequal'
import { ValidationCallback, Config, NamedInputEvent, SimpleValidationErrors, ValidationErrors, Validator as TValidator, ValidatorListeners, ValidationConfig, RequestMethod } from './types'
import { toValidationErrors } from './utils'
import { client } from './client'
import { isAxiosError } from 'axios'

export const createValidator = (callback: ValidationCallback): TValidator => {
    /**
     * Event listener state.
     */
    const listeners: ValidatorListeners = {
        errorsChanged: [],
        touchedChanged: [],
        validatingChanged: [],
    }

    /**
     * Processing validation state.
     */
    let validating = false

    const setValidating = (value: boolean) => {
        if (value !== validating) {
            validating = value

            listeners.validatingChanged.forEach(callback => callback())
        }
    }

    /**
     * Touched input state.
     */
    let touched: Array<string> = []

    const setTouched = (value: Array<string>) => {
        const uniqueNames = [...new Set(value)]

        if (touched.length !== uniqueNames.length || ! uniqueNames.every(name => touched.includes(name))) {
            touched = uniqueNames

            listeners.touchedChanged.forEach(callback => callback())
        }
    }

    /**
     * Validation errors state.
     */
    let errors: ValidationErrors = {}

    const setErrors = (value: ValidationErrors|SimpleValidationErrors) => {
        const prepared = toValidationErrors(value)

        if (! isequal(errors, prepared)) {
            errors = prepared

            listeners.errorsChanged.forEach(callback => callback())
        }

        setTouched([...touched, ...Object.keys(errors)])
    }

    /**
     * Has errors state.
     */
    const hasErrors = () => Object.keys(errors).length > 0

    /**
     * Valid validation state.
     */
    const valid = () => touched.filter(name => typeof errors[name] === 'undefined')

    /**
     * Debouncing timeout state.
     */
    let timeoutDuration = 1500

    const setTimeout = (value: number) => {
        timeoutDuration = value

        validator.cancel()

        validator = createValidator()

        return this
    }

    /**
     * The old data.
     */
    let oldData: Record<string, unknown> = {}

    /**
     * Create a debounced validation callback.
     */
    const createValidator = () => debounce(function (): void {
        let currentData = {}

        callback({
            get: (url, data = {}, config = {}) => client.get(url, resolveConfig('get', config, data)),
            post: (url, data = {}, config = {}) => client.post(url, currentData = data, resolveConfig('post', config, data)),
            patch: (url, data = {}, config = {}) => client.patch(url, currentData = data, resolveConfig('patch', config, data)),
            put: (url, data = {}, config = {}) => client.put(url, currentData = data, resolveConfig('put', config, data)),
            delete: (url, data = {}, config = {}) => client.delete(url, resolveConfig('delete', config, data)),
        }).catch((error) => ! isAxiosError(error) ? Promise.reject(error) : null)

        oldData = currentData
    }, timeoutDuration, { leading: true, trailing: true })

    /**
     * Validator state.
     */
    let validator = createValidator()

    /**
     * Resolve the configuration.
     */
    const resolveConfig = (method: RequestMethod, config: ValidationConfig, data: Record<string, unknown> = {}): Config => ({
        ...config,
        params: method === 'get' || method === 'delete'
            ? mergeParams(data, config.params)
            : config.params,
        validate: config.validate
            ? config.validate
            : touched,
        onValidationError: (response, axiosError) => {
            setErrors(response.data.errors)

            return config.onValidationError
                ? config.onValidationError(response, axiosError)
                : Promise.reject(axiosError)
        },
        onPrecognitionSuccess: (response) => {
            setErrors({})

            return config.onPrecognitionSuccess
                ? config.onPrecognitionSuccess(response)
                : response
        },
        onBefore: () => (config.onBeforeValidation ?? ((newRequest, oldRequest) => {
            return ! isequal(newRequest, oldRequest)
        }))({ data }, { data: oldData }) && (config.onBefore || (() => true))(),
        onStart: () => {
            setValidating(true);

            (config.onStart ?? (() => null))()
        },
        onFinish: () => {
            setValidating(false);

            (config.onFinish ?? (() => null))()
        },
    })

    /**
     * Merge the "GET" and "DELETE" data with the configured parameters.
     */
    const mergeParams = (data: Record<string, unknown>, params: Record<string, unknown>|URLSearchParams): URLSearchParams|Record<string, unknown> => {
        if (params instanceof URLSearchParams) {
            return Object.keys(data).reduce((previous, key) => {
                previous.set(key, data[key] as string)
                return previous
            }, params)
        }

        return {
            ...params,
            ...data,
        }
    }

    /**
     * Validate the given input.
     */
    const validate = (input: string|NamedInputEvent) => {
        input = typeof input !== 'string'
            ? input.target.name
            : input

        setTouched([input, ...touched])

        validator()
    }

    /**
     * The form validator instance.
     */
    return {
        touched: () => touched,
        validate(input) {
            validate(input)

            return this
        },
        validating: () => validating,
        valid,
        errors: () => errors,
        hasErrors,
        setErrors(value) {
            setErrors(value)

            return this
        },
        reset() {
            setTouched([])
            setErrors({})

            return this
        },
        setTimeout(value) {
            setTimeout(value)

            return this
        },
        on(event, callback) {
            listeners[event].push(callback)

            return this
        },
    }
}
