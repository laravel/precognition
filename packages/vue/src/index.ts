import { Config, RequestMethod, client, toSimpleValidationErrors } from 'laravel-precognition'
import { Form, StringKeyOf } from './types'
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
    const originalInputs = Object.keys(originalData) as StringKeyOf<Data>[]

    /**
     * The validator instance.
     */
    const validator = client.validator(client => method === 'get' || method === 'delete'
        ? client[method](url, config)
        : client[method](url, form.data(), config))

    /**
     * Reactive valid state.
     */
    const valid = ref<string[]>([])

    /**
     * Reactive touched state.
     */
    const touched = ref<string[]>([])

    /**
     * The event listeners.
     */
    validator.on('validatingChanged', () => form.validating = validator.validating())

    validator.on('touchedChanged', () => {
        touched.value = validator.touched()

        valid.value = validator.valid()
    })

    validator.on('errorsChanged', () => {
        form.hasErrors = validator.hasErrors()

        valid.value = validator.valid()

        const errors = toSimpleValidationErrors(validator.errors())

        originalInputs.forEach((name) => (form.errors[name] = errors[name]))
    })

    /**
     * Create a new form instance.
     */
    const createForm = (): Data&Form<Data> => ({
        ...cloneDeep(originalData),
        data() {
            return originalInputs.reduce((carry, name) => ({
                ...carry,
                [name]: this[name],
            }), ({} as Partial<Data>)) as Data
        },
        errors: {} as Record<StringKeyOf<Data>, string>,
        hasErrors: false,
        setErrors(errors) {
            validator.setErrors(errors)

            return this
        },
        clearErrors() {
            return this.setErrors({})
        },
        reset(...names) {
            const data = cloneDeep(originalData)

            names = (names.length === 0 ? originalInputs : names)

            names.forEach(name => (this[name] = data[name]))

            validator.reset()

            return this
        },

        validating: false,
        touched(name) {
            return touched.value.includes(name)
        },
        valid(value) {
            return valid.value.includes(value)
        },
        invalid(name) {
            return typeof this.errors[name] !== 'undefined'
        },
        validate(input) {
            validator.validate(input)

            return this
        },
        setValidationTimeout(duration) {
            validator.setTimeout(duration)

            return this
        },
        async submit(userConfig = {}): Promise<unknown> {
            const config: Config = {
                ...userConfig,
                onValidationError: (response, error) => {
                    validator.setErrors(response.data.errors)

                    return userConfig.onValidationError
                        ? userConfig.onValidationError(response)
                        : Promise.reject(error)
                },
            }

            return method === 'get' || method === 'delete'
                ? client[method](url, config)
                : client[method](url, this.data(), config)
        },
    })

    /**
     * The form instance.
     */
    const form = reactive(createForm()) as Data&Form<Data>

    return form
}
