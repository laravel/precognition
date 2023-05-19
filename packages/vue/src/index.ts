import { Config, RequestMethod, client, createValidator, toSimpleValidationErrors, SimpleValidationErrors, ValidationErrors } from 'laravel-precognition'
import { Form } from './types'
import { reactive, ref } from 'vue'
import cloneDeep from 'lodash.clonedeep'

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod, url: string, input: Data, config: Config = {}): Data&Form<Data> => {
    method = method.toLowerCase() as RequestMethod

    /**
     * The original data.
     */
    const originalData = cloneDeep(input)

    /**
     * The original input names.
     */
    const originalInputs = Object.keys(originalData) as (keyof Data)[]

    /**
     * Reactive valid state.
     */
    const valid = ref<(keyof Data)[]>([])

    /**
     * Reactive touched state.
     */
    const touched = ref([] as (keyof Data)[])

    /**
     * The validator instance.
     */
    const validator = createValidator(client => method === 'get' || method === 'delete'
        ? client[method](url, config)
        : client[method](url, form.data(), config))

    /**
     * Register event listeners...
     */
    validator.on('validatingChanged', () => form.validating = validator.validating())

    validator.on('touchedChanged', () => {
        // @ts-expect-error
        touched.value = validator.touched() as (keyof Data)[]

        // @ts-expect-error
        valid.value = validator.valid() as (keyof Data)[]
    })

    validator.on('errorsChanged', () => {
        form.hasErrors = validator.hasErrors()

        // @ts-expect-error
        valid.value = validator.valid()

        // @ts-expect-error
        form.errors = toSimpleValidationErrors(validator.errors())
    })

    /**
     * Resolve the config for a form submission.
     */
    const resolveSubmitConfig = (userConfig: Config): Config => ({
        ...userConfig,
        precognitive: false,
        onStart: () => {
            form.processing = true

            if (userConfig.onStart) {
                userConfig.onStart()
            }
        },
        onFinish: () => {
            form.processing = false

            if (userConfig.onFinish) {
                userConfig.onFinish()
            }
        },
        onValidationError: (response, error) => {
            validator.setErrors(response.data.errors)

            return userConfig.onValidationError
                ? userConfig.onValidationError(response)
                : Promise.reject(error)
        },
    })

    /**
     * Create a new form instance.
     */
    const createForm = (): Data&Form<Data> => ({
        ...cloneDeep(originalData),
        data() {
            return originalInputs.reduce((carry, name) => ({
                ...carry,
                // @ts-expect-error
                [name]: this[name],
            }), ({} as Partial<Data>)) as Data
        },
        touched(name: keyof Data) {
            // @ts-expect-error
            return touched.value.includes(name)
        },
        validate(name) {
            // @ts-expect-error
            validator.validate(name)

            return this
        },
        validating: false,
        valid(name) {
            // @ts-expect-error
            return valid.value.includes(name)
        },
        invalid(name) {
            return typeof this.errors[name] !== 'undefined'
        },
        errors: {} as Record<keyof Data, string>,
        hasErrors: false,
        setErrors(errors) {
            validator.setErrors(errors as SimpleValidationErrors|ValidationErrors)

            return this
        },
        reset(...names) {
            const data = cloneDeep(originalData)

            names = (names.length === 0 ? originalInputs : names)

            // @ts-expect-error
            names.forEach(name => (this[name] = data[name]))

            validator.reset()

            return this
        },
        setValidationTimeout(duration) {
            validator.setTimeout(duration)

            return this
        },
        processing: false,
        async submit(config = {}): Promise<unknown> {
            return (method === 'get' || method === 'delete'
                ? client[method](url, resolveSubmitConfig(config))
                : client[method](url, this.data(), resolveSubmitConfig(config)))
        },
    })

    /**
     * The form instance.
     */
    const form = reactive(createForm()) as Data&Form<Data>

    return form
}
