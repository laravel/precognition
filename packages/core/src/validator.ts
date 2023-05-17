import debounce from 'lodash.debounce'
import { Client, ClientCallback, Config, NamedInputEvent, SimpleValidationErrors, ValidationErrors, Validator as TValidator, ValidatorListeners } from './types'
import { toValidationErrors } from './utils'

export const Validator = (client: Client, callback: ClientCallback): TValidator => {
    /**
     * Registered event listeners.
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

        if (JSON.stringify(errors) !== JSON.stringify(prepared)) {
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
     * Passed validation state.
     */
    const passed = () => touched.filter(name => typeof errors[name] === 'undefined')

    /**
     * Debouncing timeout state.
     */
    let timeoutDuration = 1250

    const setTimeout = (value: number) => {
        timeoutDuration = value

        validator.cancel()

        validator = createValidator()

        return this
    }

    /**
     * Create a debounced validation callback.
     */
    const createValidator = () => debounce(function (): void {
        setValidating(true)

        callback({
            get: (url, config = {}) => client.get(url, resolveConfig(config)),
            post: (url, data = {}, config = {}) => client.post(url, data, resolveConfig(config)),
            patch: (url, data = {}, config = {}) => client.patch(url, data, resolveConfig(config)),
            put: (url, data = {}, config = {}) => client.put(url, data, resolveConfig(config)),
            delete: (url, config = {}) => client.delete(url, resolveConfig(config)),
        }).finally(() => {
            setValidating(false)
        })
    }, timeoutDuration, { leading: true, trailing: true })

    /**
     * Validator state.
     */
    let validator = createValidator()

    /**
     * Resolve the configuration.
     */
    const resolveConfig = (userConfig: Config): Config => {
        const config = { ...userConfig }

        if (! config.validate) {
            config.validate = touched
        }

        const userOnValidationErrorHandler = config.onValidationError

        config.onValidationError = (response, axiosError) => {
            setErrors(response.data.errors)

            return userOnValidationErrorHandler
                ? userOnValidationErrorHandler(response, axiosError)
                : Promise.reject(axiosError)
        }

        const userOnPrecognitionSuccessHandler = config.onPrecognitionSuccess

        config.onPrecognitionSuccess = (response) => {
            setErrors({})

            return userOnPrecognitionSuccessHandler
                ? userOnPrecognitionSuccessHandler(response)
                : response
        }

        return config
    }

    const validate = (input: string|NamedInputEvent) => {
        input = typeof input !== 'string'
            ? input.target.name
            : input

            setTouched([input, ...touched])

            validator()
    }

    return {
        validating: () => validating,
        touched: () => touched,
        setTouched(inputs) {
            setTouched(inputs)

            return this
        },
        errors: () => errors,
        setErrors(value) {
            setErrors(value)

            return this
        },
        hasErrors,
        passed,
        validate(input) {
            validate(input)

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
