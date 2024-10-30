import { get, cloneDeep, set } from 'lodash-es'

import {
    client,
    createValidator,
    type RequestMethod,
    resolveName,
    toSimpleValidationErrors,
    type ValidationConfig,
    resolveUrl,
    resolveMethod,
} from 'laravel-precognition'

import { Form } from './types.js'

export { client }
export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod | (() => RequestMethod), url: string | (() => string), inputs: Data, config: ValidationConfig = {}): Form<Data> => {
    /**
     * The original data.
     */
    const originalData = cloneDeep(inputs)

    /**
     * The original input names.
     */
    const originalInputs: (keyof Data)[] = Object.keys(originalData)

    /**
     * Reactive valid state.
     */
    // @ts-ignore
    let valid = $state<string[]>([])

    /**
     * Reactive touched state.
     */
    // @ts-ignore
    let touched = $state<string[]>([])

    /**
     * Reactive errors.
     */
    // @ts-ignore
    let errors = $state<Record<string, any>>({})

    /**
     * Reactive hasErrors.
     */
    // @ts-ignore
    let hasErrors = $state<boolean>(false)

    /**
     * Reactive Validating.
     */
    // @ts-ignore
    let validating = $state<boolean>(false)

    /**
     * Reactive Processing.
     */
    // @ts-ignore
    let processing = $state<boolean>(false)

    /**
     * Reactive Data state
     */
    // @ts-ignore
    const data = $state<Data>(cloneDeep(originalData))

    /**
     * The validator instance.
     */
    const validator = createValidator((client) => client[resolveMethod(method)](resolveUrl(url), form.getData(), config), originalData)
        .on('validatingChanged', () => {
            validating = validator.validating()
        })
        .on('validatedChanged', () => {
            valid = validator.valid()
        })
        .on('touchedChanged', () => {
            touched = validator.touched()
        })
        .on('errorsChanged', () => {
            hasErrors = validator.hasErrors()
            errors = toSimpleValidationErrors(validator.errors())
            valid = validator.valid()
        })

    /**
     * Resolve the config for a form submission.
     */
    const resolveSubmitConfig = (config: any) => ({
        ...config,
        precognitive: false,
        onStart: () => {
            processing = true
            config.onStart?.()
        },
        onFinish: () => {
            processing = false
            config.onFinish?.()
        },
        onValidationError: (response: any, error: any) => {
            validator.setErrors(response.data.errors)
            return config.onValidationError
                ? config.onValidationError(response)
                // @ts-ignore
                : Promise.reject(error)
        },
    })

    /**
     * Create a new form instance.
     */
    const form: Record<string, any> = {
        data,
        setData(newData: Record<string, unknown>) {
            Object.keys(newData).forEach((input) => {
                // @ts-ignore
                data[input] = newData[input]
            })
            return form
        },
        touched(name: string) {
            return touched.includes(resolveName(name))
        },
        touch(name: string) {
            validator.touch(name)
            return form
        },
        validate(name: string | undefined, config: any) {
            if (typeof name === 'object' && !('target' in name)) {
                config = name
                name = undefined
            }

            if (typeof name === 'undefined') {
                validator.validate(config)
            } else {
                name = resolveName(name)

                validator.validate(name, get(data, name), config)
            }

            return form
        },
        valid(name: string) {
            return valid.includes(resolveName(name))
        },
        invalid(name: string) {
            return typeof form.errors[name] !== 'undefined'
        },
        setErrors(newErrors: any) {
            validator.setErrors(newErrors)
            return form
        },
        forgetError(name: string) {
            validator.forgetError(name)
            return form
        },
        reset(...names: string[]) {
            const original = cloneDeep(originalData)

            if (names.length === 0) {
                originalInputs.forEach((name) => (data[name] = original[name]))
            } else {
                names.forEach((name : string) => set(data, name, get(original, name)))
            }

            validator.reset(...names)

            return form
        },
        setValidationTimeout(duration: number) {
            validator.setTimeout(duration)
            return form
        },
        async submit(config = {}) {
            return client[resolveMethod(method)](resolveUrl(url), form.getData(), resolveSubmitConfig(config))
        },
        validateFiles() {
            validator.validateFiles()
            return form
        },
        validator() {
            return validator
        },
        get validating() {
            return validating
        },
        get processing() {
            return processing
        },
        get errors() {
            return errors
        },
        get hasErrors() {
            return hasErrors
        },
        getData() {
            return cloneDeep(data)
        },
    }

    return form as Form<Data>
}
