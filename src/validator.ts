import debounce from 'lodash.debounce'
import { Client, ClientCallback, Config, NamedInputEvent, SimpleValidationErrors, Timeout, ValidationErrors, Validator as TValidator } from './types'

export const Validator = (client: Client, callback: ClientCallback): TValidator => {
    const mergeConfig = (config: Config|undefined): Config => {
        config = config ?? {}

        if (typeof config.validate === 'undefined') {
            config.validate = touched
        }

        const userValidationHandler = config.onValidationError

        config.onValidationError = (errors, axiosError) => {
            validator.setErrors(errors)

            if (userValidationHandler) {
                return userValidationHandler(errors, axiosError)
            }
        }

        const userSuccessHandler = config.onPrecognitionSuccess

        config.onPrecognitionSuccess = (response) => {
            validator.setErrors({})

            if (userSuccessHandler) {
                return userSuccessHandler(response)
            }
        }

        return config
    }

    const createValidator = () => debounce(function () {
        setProcessingValidation(true)

        callback({
            get: (url, config = {}) => client.get(url, mergeConfig(config)),
            post: (url, data = {}, config) => client.post(url, data, mergeConfig(config)),
            patch: (url, data = {}, config) => client.patch(url, data, mergeConfig(config)),
            put: (url, data = {}, config) => client.put(url, data, mergeConfig(config)),
            delete: (url, config = {}) => client.delete(url, mergeConfig(config)),
        }).finally(() => {
            setValidating(null)
            setProcessingValidation(false)
        })

        return validator
    }, timeoutDuration, { leading: true, trailing: true })

    let validating: string|null = null
    const setValidating = (v: string|null) => {
        if (v !== validating) {
            validating = v

            listeners.validatingChanged.forEach(callback => callback())
        }
    }

    let processingValidation = false
    const setProcessingValidation = (p: boolean) => {
        if (p !== processingValidation) {
            processingValidation = p

            listeners.processingValidationChanged.forEach(callback => callback())
        }
    }

    let touched: Set<string> = new Set
    const setTouched = (names: Array<string>) => {
        if (! names.every(name => touched.has(name))) {
            touched = new Set(names)

            listeners.touchedChanged.forEach(callback => callback())
        }
    }

    let timeoutDuration = 1333 // default: 1 + 1/3 of a second
    let validate = createValidator()
    let errors: ValidationErrors = {}
    const listeners: {
        errorsChanged: Array<() => void>,
        validatingChanged: Array<() => void>,
        touchedChanged: Array<() => void>,
        processingValidationChanged: Array<() => void>,
    } = {
        errorsChanged: [],
        validatingChanged: [],
        touchedChanged: [],
        processingValidationChanged: [],
    }

    const validator: TValidator = {
        validate(input: string|NamedInputEvent) {
            input = typeof input !== 'string' ? input.target.name : input

            setTouched([input, ...touched])
            setValidating(input)
            validate()

            return this
        },
        passed: () => Array.from(touched).filter(name => typeof errors[name] === 'undefined' && validating !== name),
        touched: () => Array.from(touched),
        onTouchedChanged(callback) {
            listeners.touchedChanged.push(callback)

            return this
        },
        validating: () => validating,
        onValidatingChanged(callback) {
            listeners.validatingChanged.push(callback)

            return this
        },
        processingValidation: () => processingValidation,
        onProcessingValidationChanged(callback) {
            listeners.processingValidationChanged.push(callback)

            return this
        },
        errors: () => errors,
        onErrorsChanged(callback) {
            listeners.errorsChanged.push(callback)

            return this
        },
        clearErrors() {
            this.setErrors({})

            return this
        },
        setErrors(e: ValidationErrors|SimpleValidationErrors) {
            const prepared: ValidationErrors = Object.keys(e).reduce((carry, key) => ({
                ...carry,
                [key]: typeof e[key] === 'string' ? [e[key]] : e[key],
            }), {})

            if (JSON.stringify(errors) !== JSON.stringify(prepared)) {
                errors = prepared

                listeners.errorsChanged.forEach(callback => callback())
            }

            return this
        },
        setTimeout(t: Timeout) {
            timeoutDuration = (t.milliseconds ?? 0)
                + ((t.seconds ?? 0) * 1000)
                + ((t.minutes ?? 0) * 60000)
                + ((t.hours ?? 0) * 3600000)

            validate.cancel()
            validate = createValidator()

            return this
        },
    }

    return validator
}
