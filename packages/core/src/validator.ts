import { debounce, isEqual, get, set, omit, merge } from 'lodash-es'
import { ValidationCallback, Config, NamedInputEvent, SimpleValidationErrors, ValidationErrors, Validator as TValidator, ValidatorListeners, ValidationConfig } from './types.js'
import { client, isFile } from './client.js'
import { isAxiosError } from 'axios'

export const createValidator = (callback: ValidationCallback, initialData: Record<string, unknown> = {}): TValidator => {
    /**
     * Event listener state.
     */
    const listeners: ValidatorListeners = {
        errorsChanged: [],
        touchedChanged: [],
        validatingChanged: [],
        validatedChanged: [],
    }

    /**
     * Validate files state.
     */
    let validateFiles = false

    /**
     * Processing validation state.
     */
    let validating = false

    /**
     * Set the validating inputs.
     *
     * Returns an array of listeners that should be invoked once all state
     * changes have taken place.
     */
    const setValidating = (value: boolean): (() => void)[] => {
        if (value !== validating) {
            validating = value

            return listeners.validatingChanged
        }

         return []
    }

    /**
     * Inputs that have been validated.
     */
    let validated: Array<string> = []

    /**
     * Set the validated inputs.
     *
     * Returns an array of listeners that should be invoked once all state
     * changes have taken place.
     */
    const setValidated = (value: Array<string>): (() => void)[] => {
        const uniqueNames = [...new Set(value)]

        if (validated.length !== uniqueNames.length || ! uniqueNames.every(name => validated.includes(name))) {
            validated = uniqueNames

            return listeners.validatedChanged
        }

        return []
    }

    /**
     * Valid validation state.
     */
    const valid = () => validated.filter(name => typeof errors[name] === 'undefined')

    /**
     * Touched input state.
     */
    let touched: Array<string> = []

    /**
     * Set the touched inputs.
     *
     * Returns an array of listeners that should be invoked once all state
     * changes have taken place.
     */
    const setTouched = (value: Array<string>): (() => void)[] => {
        const uniqueNames = [...new Set(value)]

        if (touched.length !== uniqueNames.length || ! uniqueNames.every(name => touched.includes(name))) {
            touched = uniqueNames

            return listeners.touchedChanged
        }

        return []
    }

    /**
     * Validation errors state.
     */
    let errors: ValidationErrors = {}

    /**
     * Set the input errors.
     *
     * Returns an array of listeners that should be invoked once all state
     * changes have taken place.
     */
    const setErrors = (value: ValidationErrors|SimpleValidationErrors): (() => void)[] => {
        const prepared = toValidationErrors(value)

        if (! isEqual(errors, prepared)) {
            errors = prepared

            return listeners.errorsChanged
        }

        return []
    }

    /**
     * Forget the given input's errors.
     *
     * Returns an array of listeners that should be invoked once all state
     * changes have taken place.
     */
    const forgetError = (name: string|NamedInputEvent): (() => void)[] => {
        const newErrors = { ...errors }

        delete newErrors[resolveName(name)]

        return setErrors(newErrors)
    }

    /**
     * Has errors state.
     */
    const hasErrors = () => Object.keys(errors).length > 0

    /**
     * Debouncing timeout state.
     */
    let debounceTimeoutDuration = 1500

    const setDebounceTimeout = (value: number) => {
        debounceTimeoutDuration = value

        validator.cancel()

        validator = createValidator()
    }

    /**
     * The old data.
     */
    let oldData = initialData

    /**
     * The data currently being validated.
     */
    let validatingData: null|Record<string, unknown> = null

    /**
     * The old touched.
     */
    let oldTouched: string[] = []

    /**
     * The touched currently being validated.
     */
    let validatingTouched: null|string[] = null

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
                [
                    ...setValidated([...validated, ...validate]),
                    ...setErrors(merge(omit({ ...errors }, validate), response.data.errors)),
                ].forEach(listener => listener())

                return config.onValidationError
                    ? config.onValidationError(response, axiosError)
                    : Promise.reject(axiosError)
            },
            onSuccess: () => {
                setValidated([...validated, ...validate]).forEach(listener => listener())
            },
            onPrecognitionSuccess: (response) => {
                [
                    ...setValidated([...validated, ...validate]),
                    ...setErrors(omit({ ...errors }, validate)),
                ].forEach(listener => listener())

                return config.onPrecognitionSuccess
                    ? config.onPrecognitionSuccess(response)
                    : response
            },
            onBefore: () => {
                const beforeValidationResult = (config.onBeforeValidation ?? ((previous, next) => {
                    return ! isEqual(previous, next)
                }))({ data, touched }, { data: oldData, touched: oldTouched })

                if (beforeValidationResult === false) {
                    return false
                }

                const beforeResult = (config.onBefore || (() => true))()

                if (beforeResult === false) {
                    return false
                }

                validatingTouched = touched

                validatingData = data

                return true
            },
            onStart: () => {
                setValidating(true).forEach(listener => listener());

                (config.onStart ?? (() => null))()
            },
            onFinish: () => {
                setValidating(false).forEach(listener => listener())

                oldTouched = validatingTouched!

                oldData = validatingData!

                validatingTouched = validatingData = null;

                (config.onFinish ?? (() => null))()
            },
        }
    }

    /**
     * Validate the given input.
     */
    const validate = (name?: string|NamedInputEvent, value?: unknown) => {
        if (typeof name === 'undefined') {
            validator()

            return
        }

        if (isFile(value) && !validateFiles) {
            console.warn('Precognition file validation is not active. Call the "validateFiles" function on your form to enable it.')

            return
        }

        name = resolveName(name)

        if (get(oldData, name) !== value) {
            setTouched([name, ...touched]).forEach(listener => listener())
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
    const form: TValidator = {
        touched: () => touched,
        validate(input, value) {
            validate(input, value)

            return form
        },
        touch(input) {
            const inputs = Array.isArray(input)
                ? input
                : [resolveName(input)]

            setTouched([...touched, ...inputs]).forEach(listener => listener())

            return form
        },
        validating: () => validating,
        valid,
        errors: () => errors,
        hasErrors,
        setErrors(value) {
            setErrors(value).forEach(listener => listener())

            return form
        },
        forgetError(name) {
            forgetError(name).forEach(listener => listener())

            return form
        },
        reset(...names) {
            if (names.length === 0) {
                setTouched([]).forEach(listener => listener())
            } else {
                const newTouched = [...touched]

                names.forEach(name => {
                    if (newTouched.includes(name)) {
                        newTouched.splice(newTouched.indexOf(name), 1)
                    }

                    set(oldData, name, get(initialData, name))
                })

                setTouched(newTouched).forEach(listener => listener())
            }

            return form
        },
        setTimeout(value) {
            setDebounceTimeout(value)

            return form
        },
        on(event, callback) {
            listeners[event].push(callback)

            return form
        },
        validateFiles() {
            validateFiles = true

            return form
        },
    }

    return form
}

/**
 * Normalise the validation errors as Inertia formatted errors.
 */
export const toSimpleValidationErrors = (errors: ValidationErrors|SimpleValidationErrors): SimpleValidationErrors => {
    return Object.keys(errors).reduce((carry, key) => ({
        ...carry,
        [key]: Array.isArray(errors[key])
            ? errors[key][0]
            : errors[key],
    }), {})
}

/**
 * Normalise the validation errors as Laravel formatted errors.
 */
export const toValidationErrors = (errors: ValidationErrors|SimpleValidationErrors): ValidationErrors => {
    return Object.keys(errors).reduce((carry, key) => ({
        ...carry,
        [key]: typeof errors[key] === 'string' ? [errors[key]] : errors[key],
    }), {})
}

/**
 * Resolve the input's "name" attribute.
 */
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
            newData[name] = value.filter((value) => !isFile(value))

            return
        }

        if (typeof value === 'object') {
            // @ts-expect-error
            newData[name] = forgetFiles(newData[name])

            return
        }
    })

    return newData
}
