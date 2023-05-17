import { Config, RequestMethod, client, toSimpleValidationErrors, NamedInputEvent, SimpleValidationErrors, ValidationErrors } from 'laravel-precognition'
import { Form, StringKeyOf } from './types'
import { reactive, ref } from 'vue'
import cloneDeep from 'lodash.clonedeep'

export const useForm = <TData extends Record<string, unknown>>(method: RequestMethod, url: string, input: TData, config: Config = {}): TData & Form<TData> => {
    method = method.toLowerCase() as RequestMethod

    /**
     * The original user supplied data.
     */
    const defaults = cloneDeep(input)

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

        const keys = Object.keys(errors) as StringKeyOf<TData>[]

        keys.forEach((key) => {
            form.errors[key] = errors[key]
        })
    })

    /**
     * The form instance.
     */

    const form = reactive({
        ...defaults,
        data() {
            return Object.keys(defaults).reduce((carry, key) => ({
                ...carry,
                [key]: this[key],
            }), {})
        },
        validating: false,
        errors: {} as Record<StringKeyOf<TData>, string>,
        hasErrors: false,
        valid(value: StringKeyOf<TData>) {
            return passed.value.includes(value)
        },
        invalid(name: StringKeyOf<TData>) {
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
        reset(...keys: (StringKeyOf<TData>)[]) {
            const clonedDefaults = cloneDeep(defaults)

            keys = keys.length === 0
                ? Object.keys(defaults) as StringKeyOf<TData>[]
                : keys

            keys.forEach(key => {
                this[key] = clonedDefaults[key]
            })

            validator.setErrors({}).setTouched([])

            return this
        },
    }) as Form<TData> & TData

    return form
}
