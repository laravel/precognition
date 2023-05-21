import { Config, RequestMethod, client, createValidator, toSimpleValidationErrors } from 'laravel-precognition'
import { Form } from './types'
import { reactive, ref } from 'vue'
import cloneDeep from 'lodash.clonedeep'
// @ts-expect-error
import get from 'lodash.get'

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod, url: string, inputs: Data, config: Config = {}): Data&Form<Data> => {
    // @ts-expect-error
    method = method.toLowerCase()

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
    const valid = ref<(keyof Data)[]>([])

    /**
     * Reactive touched state.
     */
    const touched = ref<(keyof Partial<Data>)[]>([])

    /**
     * The validator instance.
     */
    const validator = createValidator(client => client[method](url, form.data(), config), inputs)
        .on('validatingChanged', () => {
            form.validating = validator.validating()
        })
        .on('touchedChanged', () => {
            // @ts-expect-error
            touched.value = validator.touched()

            // @ts-expect-error
            valid.value = validator.valid()
        })
        .on('errorsChanged', () => {
            form.hasErrors = validator.hasErrors()

            // @ts-expect-error
            valid.value = validator.valid()

            // @ts-expect-error
            form.errors = toSimpleValidationErrors(validator.errors())
        })

    /**
     * Resolve the config for a form submission.
     */
    const resolveSubmitConfig = (config: Config): Config => ({
        ...config,
        precognitive: false,
        onStart: () => {
            form.processing = true;

            (config.onStart ?? (() => null))()
        },
        onFinish: () => {
            form.processing = false;

            (config.onFinish ?? (() => null))()
        },
        onValidationError: (response, error) => {
            validator.setErrors(response.data.errors)

            return config.onValidationError
                ? config.onValidationError(response)
                : Promise.reject(error)
        },
    })

    /**
     * Create a new form instance.
     */
    const createForm = (): Data&Form<Data> => ({
        ...cloneDeep(originalData),
        data() {
            return originalInputs.reduce<Partial<Data>>((carry, name) => ({
                ...carry,
                [name]: form[name],
            }), {}) as Data
        },
        touched(name) {
            // @ts-expect-error
            return touched.value.includes(name)
        },
        validate(name) {
            name = typeof name !== 'string'
                // @ts-expect-error
                ? name.target.name
                : name

            console.log(name, get(this.data(), name))

            // @ts-expect-error
            validator.validate(name, get(this.data(), name))

            return form
        },
        validating: false,
        valid(name) {
            // @ts-expect-error
            return valid.value.includes(name)
        },
        invalid(name) {
            return typeof form.errors[name] !== 'undefined'
        },
        errors: {},
        hasErrors: false,
        setErrors(errors) {
            // @ts-expect-error
            validator.setErrors(errors)

            return form
        },
        reset(...names) {
            const data = cloneDeep(originalData)

            names = (names.length === 0 ? originalInputs : names)

            // @ts-expect-error
            names.forEach(name => (form[name] = data[name]))

            validator.reset()

            return form
        },
        setValidationTimeout(duration) {
            validator.setTimeout(duration)

            return form
        },
        processing: false,
        async submit(config = {}) {
            return client[method](url, form.data(), resolveSubmitConfig(config))
        },
    })

    /**
     * The form instance.
     */
    const form = reactive(createForm()) as Data&Form<Data>

    return form
}
