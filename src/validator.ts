import debounce from 'lodash.debounce'
import { Client, ClientCallback, Config, SimpleValidationErrors, Timeout, ValidationErrors, Validator as TValidator, ValidatorListeners } from './types'

export const Validator = (client: Client, callback: ClientCallback): TValidator => {
    /**
     * Create a debounced validation callback.
     */
    const createValidator = () => debounce(function (): void {
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

    /**
     * Resolve the configuration.
     */
    const resolveConfig = (c: Config): Config => {
        const config = { ...c }

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
            clearErrors()

            return userOnPrecognitionSuccessHandler ? userOnPrecognitionSuccessHandler(response) : response
        }

        return config
    }

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
        const uniqueNames = [...new Set(names)]

        if (touched.length !== uniqueNames.length || ! uniqueNames.every(name => touched.includes(name))) {
            touched = uniqueNames

            listeners.touchedChanged.forEach(callback => callback())
        }
    }

    /**
     * Validation errors state.
     */
    let errors: ValidationErrors = {}

    const setErrors = (e: ValidationErrors|SimpleValidationErrors) => {
        const prepared = toValidationErrors(e)

        if (JSON.stringify(errors) !== JSON.stringify(prepared)) {
            errors = prepared

            listeners.errorsChanged.forEach(callback => callback())
        }

        setTouched([...touched, ...Object.keys(errors)])
    }

    const clearErrors = () => {
        if (Object.keys(errors).length > 0) {
            errors = {}

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

    /*
     * Validator state.
     */
    let validator = createValidator()

     return {
        validate(input) {
            input = typeof input !== 'string' ? input.target.name : input

            setTouched([input, ...touched])

            setValidating(input)

            validator()

            return this
        },
        validating: () => validating,
        processingValidation: () => processingValidation,
        touched: () => touched,
        passed: () => touched.filter(name => typeof errors[name] === 'undefined'),
        errors: () => errors,
        hasErrors: () => Object.keys(errors).length > 0,
        setErrors(e) {
            setErrors(e)

            return this
        },
        clearErrors() {
            clearErrors()

            return this
        },
        setTimeout(t) {
            setTimeout(t)

            return this
        },
        on(event, callback) {
            listeners[event].push(callback)

            return this
        },
    }
}

const toValidationErrors = (errors: ValidationErrors|SimpleValidationErrors): ValidationErrors => {
    return Object.keys(errors).reduce((carry, key) => ({
        ...carry,
        [key]: typeof errors[key] === 'string' ? [errors[key]] : errors[key],
    }), {})
}
