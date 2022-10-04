import debounce from 'lodash.debounce'
import { Client, ClientCallback, Config, NamedInputEvent, SimpleValidationErrors, Timeout, ValidationErrors, Validator as TValidator, ValidatorListeners } from './types'

export const Validator = (client: Client, callback: ClientCallback): TValidator => {
    /**
     * Resolve the configuration.
     */
    const resolveConfig = (config: Config): Config => {
        if (! config.validate) {
            config.validate = touched
        }

        const userOnValidationErrorHandler = config.onValidationError

        config.onValidationError = (response, axiosError) => {
            setErrors(response.data.errors)

            return userOnValidationErrorHandler ? userOnValidationErrorHandler(response, axiosError) : Promise.reject(axiosError)
        }

        const userOnPrecognitionSuccessHandler = config.onPrecognitionSuccess

        config.onPrecognitionSuccess = (response) => {
            setErrors({})

            return userOnPrecognitionSuccessHandler ? userOnPrecognitionSuccessHandler(response) : response
        }

        return config
    }

    /**
     * Create a debounced validation callback.
     */
    const createValidator = () => debounce(function () {
        setProcessingValidation(true)

        callback({
            get: (url, config = {}) => client.get(url, resolveConfig(config)),
            post: (url, data = {}, config = {}) => client.post(url, data, resolveConfig(config)),
            patch: (url, data = {}, config = {}) => client.patch(url, data, resolveConfig(config)),
            put: (url, data = {}, config = {}) => client.put(url, data, resolveConfig(config)),
            delete: (url, config = {}) => client.delete(url, resolveConfig(config)),
        }).finally(() => {
            setValidating(null)
            setProcessingValidation(false)
        })
    }, timeoutDuration, { leading: true, trailing: true })

    /*
     * Validator state.
     */
    let validator = createValidator()

    /**
     * Validating input state.
     */
    let validating: string|null = null

    const setValidating = (v: string|null) => {
        if (v !== validating) {
            validating = v

            listeners.validatingChanged.forEach(callback => callback())
        }
    }

    /**
     * Processing validation state.
     */
    let processingValidation = false

    const setProcessingValidation = (p: boolean) => {
        if (p !== processingValidation) {
            processingValidation = p

            listeners.processingValidationChanged.forEach(callback => callback())
        }
    }

    /**
     * Touched input state.
     */
    let touched: Array<string> = []

    const setTouched = (names: Array<string>) => {
        if (touched.length !== names.length || ! names.every(name => touched.includes(name))) {
            touched = [...new Set(names)]

            listeners.touchedChanged.forEach(callback => callback())
        }
    }

    /**
     * Validation errors state.
     */
    let errors: ValidationErrors = {}

    const setErrors = (e: ValidationErrors|SimpleValidationErrors) => {
        const prepared: ValidationErrors = Object.keys(e).reduce((carry, key) => ({
            ...carry,
            [key]: typeof e[key] === 'string' ? [e[key]] : e[key],
        }), {})

        if (JSON.stringify(errors) !== JSON.stringify(prepared)) {
            errors = prepared

            listeners.errorsChanged.forEach(callback => callback())
        }
    }

    /**
     * Debouncing timeout state.
     */
    let timeoutDuration = 1250

    const setTimeout = (t: Timeout) => {
        timeoutDuration = (t.milliseconds ?? 0)
            + ((t.seconds ?? 0) * 1000)
            + ((t.minutes ?? 0) * 60000)
            + ((t.hours ?? 0) * 3600000)

        validator.cancel()

        validator = createValidator()

        return this
    }

    /**
     * Registered event listeners.
     */
    const listeners: ValidatorListeners = {
        errorsChanged: [],
        processingValidationChanged: [],
        touchedChanged: [],
        validatingChanged: [],
    }

     return {
        validate(input: string|NamedInputEvent) {
            input = typeof input !== 'string' ? input.target.name : input

            setTouched([input, ...touched])

            setValidating(input)

            validator()

            return this
        },
        validating: () => validating,
        processingValidation: () => processingValidation,
        touched: () => touched,
        passed: () => touched.filter(name => typeof errors[name] === 'undefined' && validating !== name),
        errors: () => errors,
        clearErrors() {
            setErrors({})

            return this
        },
        setErrors(e: ValidationErrors|SimpleValidationErrors) {
            setErrors(e)

            return this
        },
        setTimeout(t: Timeout) {
            setTimeout(t)

            return this
        },
        on(event: keyof ValidatorListeners, callback) {
            listeners[event].push(callback)

            return this
        },
    }
}
