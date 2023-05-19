import debounce from 'lodash.debounce'
import { ClientCallback, Config, NamedInputEvent, SimpleValidationErrors, ValidationErrors, Validator as TValidator, ValidatorListeners } from './types'
import { toValidationErrors } from './utils'
import { client } from './client'
import {isAxiosError} from 'axios'

export const createValidator = (callback: ClientCallback): TValidator => {
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
     * Create a debounced validation callback.
     */
    const createValidator = () => debounce(function (): void {
        callback({
            get: (url, config = {}) => client.get(url, resolveConfig(config)),
            post: (url, data = {}, config = {}) => client.post(url, data, resolveConfig(config)),
            patch: (url, data = {}, config = {}) => client.patch(url, data, resolveConfig(config)),
            put: (url, data = {}, config = {}) => client.put(url, data, resolveConfig(config)),
            delete: (url, config = {}) => client.delete(url, resolveConfig(config)),
        }).catch((error) => ! isAxiosError(error) ? Promise.reject(error) : null)
    }, timeoutDuration, { leading: true, trailing: true })

    /**
     * Validator state.
     */
    let validator = createValidator()

    /**
     * Resolve the configuration.
     */
    const resolveConfig = (config: Config): Config => ({
        ...config,
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
        onStart: () => {
            setValidating(true);

            (config.onStart ?? (() => null))()
        },
        onFinish: () => {
            setValidating(false);

            (config.onFinish ?? (() => null))()
        },
    })

    const validate = (input: string|NamedInputEvent) => {
        input = typeof input !== 'string'
            ? input.target.name
            : input

        setTouched([input, ...touched])

        validator()
    }

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
