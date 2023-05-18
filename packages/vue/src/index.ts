import { Config, RequestMethod, client, toSimpleValidationErrors, NamedInputEvent, SimpleValidationErrors, ValidationErrors } from 'laravel-precognition'
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
     * Reactive passed validation state.
     */
    const passed = ref(validator.passed())

    /**
     * The event listeners.
     */
    validator.on('touchedChanged', () => passed.value = validator.passed())

    validator.on('validatingChanged', () => form.validating = validator.validating())

    validator.on('errorsChanged', () => {
        form.hasErrors = validator.hasErrors()

        passed.value = validator.passed()

        const errors = toSimpleValidationErrors(validator.errors())

        originalInputs.forEach((name) => {
            form.errors[name] = errors[name]
        })
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
        validating: false,
        errors: {} as Record<StringKeyOf<Data>, string>,
        hasErrors: false,
        valid(value: StringKeyOf<Data>) {
            return passed.value.includes(value)
        },
        invalid(name: StringKeyOf<Data>) {
            return typeof this.errors[name] !== 'undefined'
        },
        validate(input: string|NamedInputEvent) {
            validator.validate(input)

            return this
        },
        setErrors(errors: SimpleValidationErrors|ValidationErrors) {
            validator.setErrors(errors)

            return this
        },
        clearErrors() {
            validator.setErrors({})

            return this
        },
        setValidationTimeout(duration: number) {
            validator.setTimeout(duration)

            return this
        },
        async submit(userConfig: Config = {}): Promise<unknown> {
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
        reset(...names: (StringKeyOf<Data>)[]) {
            const clonedDefaults = cloneDeep(originalData)

            names = (names.length === 0 ? originalInputs : names)

            names.forEach(name => {
                this[name] = clonedDefaults[name]
            })

            validator.setErrors({}).setTouched([])

            return this
        },
    })

    /**
     * The form instance.
     */
    const form = reactive(createForm()) as Data&Form<Data>

    return form
}
