import {
    Config,
    RequestMethod,
    ValidationConfig,
    client,
    createValidator,
    resolveMethod,
    resolveName,
    resolveUrl,
    toSimpleValidationErrors,
} from 'laravel-precognition'
import { cloneDeep, get, set } from 'lodash-es'
import { Form } from './types.js'

export { client }

export const useForm = <Data extends Record<string, unknown>>(
    method: RequestMethod | (() => RequestMethod),
    url: string | (() => string),
    inputs: Data,
    config: ValidationConfig = {},
): Data & Form<Data> => {
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
    let errors = $state<Record<keyof Data, any>>({})

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
    const validator = createValidator(
        (client) => client[resolveMethod(method)](resolveUrl(url), form.data(), config),
        originalData,
    )
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

            return config.onValidationError ? config.onValidationError(response) : Promise.reject(error)
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
        setData(newData: Data & Record<string, unknown>) {
            Object.keys(newData).forEach((input) => {
                data[input] = newData[input]
            })
            return form
        },
        touched(name: keyof Data) {
            return touched.includes(name)
        },
        touch(name: keyof Data & string) {
            validator.touch(name)

            return form
        },
        validate(name: keyof Data | undefined, config: Config) {
            if (typeof name === 'object' && !('target' in name)) {
                config = name
                name = undefined
            }

            if (typeof name === 'undefined') {
                validator.validate(config)
            } else {
                name = resolveName(name as string)

                validator.validate(name, get(data, name), config)
            }

            return form
        },
        get validating() {
            return validating
        },
        valid(name: keyof Data) {
            return valid.includes(resolveName(name as string))
        },
        invalid(name: keyof Data) {
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
        forgetError(name: keyof Data) {
            validator.forgetError(name as string)

            return form
        },
        reset(...names: (keyof Data & string)[]) {
            const original = cloneDeep(originalData)

            if (names.length === 0) {
                originalInputs.forEach((name) => (data[name] = original[name]))
            } else {
                names.forEach((name: keyof Data) => set(data, name, get(original, name)))
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
    }

    ;(Object.keys(data) as Array<keyof Data>).forEach((key) => {
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
