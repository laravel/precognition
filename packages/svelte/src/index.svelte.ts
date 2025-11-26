import { Config, RequestMethod, client, createValidator, toSimpleValidationErrors, ValidationConfig, resolveUrl, resolveMethod , resolveName } from 'laravel-precognition'
import { Form } from './types.js'
import { get, cloneDeep, set } from 'lodash-es'

export { client }

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod | (() => RequestMethod), url: string | (() => string), inputs: Data, config: ValidationConfig = {}): Data & Form<Data> => {
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
    let valid = $state<(keyof Data)[]>([])

    /**
     * Reactive touched state.
     */
    // @ts-ignore
    let touched = $state<(keyof Partial<Data>)[]>([])

    /**
     * Reactive errors.
     */
    // @ts-ignore
    let errors = $state<Record<keyof Data , any>>({})

    /**
     * Reactive hasErrors.
     */
    // @ts-ignore
    const hasErrors = $derived<boolean>(Object.keys(errors).length > 0)

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
    const validator = createValidator((client) => client[resolveMethod(method)](resolveUrl(url), form.data(), config), originalData)
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
            errors = toSimpleValidationErrors(validator.errors()) as Record<keyof Data, any>
            valid = validator.valid()
        })

    /**
     * Resolve the config for a form submission.
     */
    const resolveSubmitConfig = (config: Config): Config => ({
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
    const form: Data & Form<Data> = {
        ...cloneDeep(originalData),
        data() {
            // @ts-ignore
            return $state.snapshot(data) as Data
        },
        setData(newData: Record<string, unknown>) {
            Object.keys(newData).forEach((input) => {
                // @ts-ignore
                data[input] = newData[input]
            })
            return form
        },
        touched(name: string) {
            return touched.includes(name)
        },
        touch(name: string) {
            validator.touch(name)

            return form
        },
        validate(name: string | undefined, config: Config) {
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
        get validating() {
            return validating
        },
        valid(name: string) {
            return valid.includes(resolveName(name))
        },
        invalid(name: string) {
            return typeof form.errors[name] !== 'undefined'
        },
        get errors() {
            return errors
        },
        get hasErrors() {
            return hasErrors
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
        get processing() {
            return processing
        },
        async submit(config = {}) {
            return client[resolveMethod(method)](resolveUrl(url), form.data(), resolveSubmitConfig(config))
        },
        validateFiles() {
            validator.validateFiles()

            return form
        },
        validator() {
            return validator
        },
    };

    (Object.keys(data) as Array<keyof Data>).forEach((key) => {
        Object.defineProperty(form, key, {
            get() {
                return data[key]
            },
            set(value: Data[keyof Data]) {
                data[key] = value
            },
        })
    })

    return form as Data & Form<Data>
}
