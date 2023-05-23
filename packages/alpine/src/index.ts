import { client, Config, createValidator, RequestMethod, resolveName, toSimpleValidationErrors, ValidationConfig } from 'laravel-precognition'
import cloneDeep from 'lodash.clonedeep'
import get from 'lodash.get';
import set from 'lodash.set';
import { Form } from './types'

export default function (Alpine: any) {
    Alpine.magic('form', () => <Data extends Record<string, unknown>>(method: RequestMethod, url: string, inputs: Data, config: ValidationConfig = {}): Data&Form<Data> => {
        // @ts-expect-error
        method = method.toLowerCase()

        /**
         * The original data.
         */
        const originalData = cloneDeep(inputs)

        /**
         * The original input names.
         */
        const originalInputs = Object.keys(originalData)

        /**
         * Internal reactive state.
         */
        let state: {
            touched: string[],
            valid: string[],
        } = Alpine.reactive({
            touched: [],
            valid: [],
        })

        /**
         * The validator instance.
         */
        const validator = createValidator(client => client[method](url, form.data(), config), originalData)
        .on('validatingChanged', () => {
            form.validating = validator.validating()
        })
        .on('touchedChanged', () => {
            state.valid = validator.valid()

            state.touched = validator.touched()
        })
        .on('errorsChanged', () => {
            state.valid = validator.valid()

            form.hasErrors = validator.hasErrors()

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
            ...cloneDeep(inputs),
            data() {
                return originalInputs.reduce((carry, name) => ({
                    ...carry,
                    [name]: cloneDeep(this[name]),
                }), {}) as Data
            },
            touched(name) {
                return state.touched.includes(name)
            },
            validate(name) {
                name = resolveName(name)

                validator.validate(name, get(this.data(), name))

                return form
            },
            validating: false,
            valid(name) {
                return state.valid.includes(name)
            },
            invalid(name) {
                return typeof form.errors[name] !== 'undefined'
            },
            errors: {},
            hasErrors: false,
            setErrors(errors) {
                validator.setErrors(errors)

                return form
            },
            reset(...names) {
                const original = cloneDeep(originalData)

                if (names.length === 0) {
                    // @ts-expect-error
                    originalInputs.forEach(name => (form[name] = original[name]))
                } else {
                    names.forEach(name => set(form, name, get(original, name)))
                }

                validator.reset(...names)

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
            validator() {
                return validator
            },
        })

        const form = Alpine.reactive(createForm()) as Data&Form<Data>

        return form
    })
}
