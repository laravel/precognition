import debounce from 'lodash.debounce'
import isequal from 'lodash.isequal'
import get from 'lodash.get'
import set from 'lodash.set'
import { ValidationCallback, Config, NamedInputEvent, SimpleValidationErrors, ValidationErrors, Validator as TValidator, ValidatorListeners, ValidationConfig } from './types'
import { client, isFile } from './client'
import { isAxiosError } from 'axios'
import omit from 'lodash.omit'
import merge from 'lodash.merge'

export const createValidator = (callback: ValidationCallback, initialData: Record<string, unknown> = {}): TValidator => {
    /**
     * Event listener state.
     */
    const listeners: ValidatorListeners = {
        errorsChanged: [],
        touchedChanged: [],
        validatingChanged: [],
    }

    /**
     * Validate files state.
     */
    let validateFiles = false

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
    let debounceTimeoutDuration = 1500

    const setDebounceTimeout = (value: number) => {
        debounceTimeoutDuration = value

        validator.cancel()

        validator = createValidator()

        return this
    }

    /**
     * The old data.
     */
    let oldData = initialData

    /**
     * Create a debounced validation callback.
     */
    const createValidator = () => debounce(() => {
        callback({
            get: (url, data = {}, config = {}) => client.get(url, parseData(data), resolveConfig(config, data)),
            post: (url, data = {}, config = {}) => client.post(url, parseData(data), resolveConfig(config, data)),
            patch: (url, data = {}, config = {}) => client.patch(url, parseData(data), resolveConfig(config, data)),
            put: (url, data = {}, config = {}) => client.put(url, parseData(data), resolveConfig(config, data)),
            delete: (url, data = {}, config = {}) => client.delete(url, parseData(data), resolveConfig(config, data)),
        })
        .catch(error => isAxiosError(error) ? null : Promise.reject(error))
    }, debounceTimeoutDuration, { leading: true, trailing: true })

    /**
     * Validator state.
     */
    let validator = createValidator()

    /**
     * Resolve the configuration.
     */
    const resolveConfig = (config: ValidationConfig, data: Record<string, unknown> = {}): Config => {
        const validate = Array.from(config.validate ?? touched)

        return {
            ...config,
            validate,
            timeout: config.timeout ?? 5000,
            onValidationError: (response, axiosError) => {
                setErrors(merge({ ...omit(errors, validate) }, response.data.errors))

                return config.onValidationError
                    ? config.onValidationError(response, axiosError)
                    : Promise.reject(axiosError)
            },
            onPrecognitionSuccess: (response) => {
                setErrors(omit(errors, validate))

                return config.onPrecognitionSuccess
                    ? config.onPrecognitionSuccess(response)
                    : response
            },
            onBefore: () => {
                const beforeValidationResult = (config.onBeforeValidation ?? ((newRequest, oldRequest) => {
                    return ! isequal(newRequest, oldRequest)
                }))({ data }, { data: oldData })

                if (beforeValidationResult === false) {
                    return false
                }

                const beforeResult = (config.onBefore || (() => true))()

                if (beforeResult === false) {
                    return false
                }

                oldData = data

                return true
            },
            onStart: () => {
                setValidating(true);

                (config.onStart ?? (() => null))()
            },
            onFinish: () => {
                setValidating(false);

                (config.onFinish ?? (() => null))()
            },
        }
    }

    /**
     * Validate the given input.
     */
    const validate = (name: string|NamedInputEvent, value: unknown) => {
        name = resolveName(name)

        if (isFile(value) && !validateFiles) {
            console.warn('Precognition file validation is not active. Call the "validateFiles" function on your form to enable it.')

            return
        }

        if (get(oldData, name) !== value) {
            setTouched([name, ...touched])
        }

        if (touched.length === 0) {
            return
        }

        validator()
    }

    /**
     * Parse the validated data.
     */
    const parseData = (data: Record<string, unknown>): Record<string, unknown> => validateFiles === false
        ? forgetFiles(data)
        : data

    /**
     * The form validator instance.
     */
    return {
        touched: () => touched,
        validate(input, value) {
            validate(input, value)

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
        reset(...names) {
            if (names.length === 0) {
                setTouched([])
            } else {
                const newTouched = [...touched]

                names.forEach(name => {
                    if (newTouched.includes(name)) {
                        newTouched.splice(newTouched.indexOf(name), 1)
                    }

                    set(oldData, name, get(initialData, name))
                })

                setTouched(newTouched)
            }

            return this
        },
        setTimeout(value) {
            setDebounceTimeout(value)

            return this
        },
        on(event, callback) {
            listeners[event].push(callback)

            return this
        },
        validateFiles() {
            validateFiles = true

            return this
        },
    }
}

export const toSimpleValidationErrors = (errors: ValidationErrors|SimpleValidationErrors): SimpleValidationErrors => {
    return Object.keys(errors).reduce((carry, key) => ({
        ...carry,
        [key]: Array.isArray(errors[key])
            ? errors[key][0]
            : errors[key],
    }), {})
}

export const toValidationErrors = (errors: ValidationErrors|SimpleValidationErrors): ValidationErrors => {
    return Object.keys(errors).reduce((carry, key) => ({
        ...carry,
        [key]: typeof errors[key] === 'string' ? [errors[key]] : errors[key],
    }), {})
}

export const resolveName = (name: string|NamedInputEvent): string => {
    return typeof name !== 'string'
        ? name.target.name
        : name
}

/**
 * Forget any files from the payload.
 */
const forgetFiles = (data: Record<string, unknown>): Record<string, unknown> => {
    const newData = { ...data }

    Object.keys(newData).forEach(name => {
        const value = newData[name]

        if (value === null) {
            return
        }

        if (isFile(value)) {
            delete newData[name]

            return
        }

        if (Array.isArray(value)) {
            newData[name] = value.filter(isFile)

            return
        }

        if (typeof value === "object") {
            // @ts-expect-error
            newData[name] = forgetFiles(newData[name])

            return
        }
    })

    return newData
}
