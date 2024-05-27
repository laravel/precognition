import { Config, RequestMethod, client, createValidator, toSimpleValidationErrors, ValidationConfig, resolveUrl, resolveMethod , resolveName } from 'laravel-precognition'
import { Form } from './types.js'
import { reactive, ref, toRaw } from 'vue'
import { cloneDeep, get, set } from 'lodash-es'

export { client }

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod|(() => RequestMethod), url: string|(() => string), inputs: Data, config: ValidationConfig = {}): Data&Form<Data> => {
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
    const validator = createValidator(client => client[resolveMethod(method)](resolveUrl(url), form.data(), config), originalData)
        .on('validatingChanged', () => {
            form.validating = validator.validating()
        })
        .on('validatedChanged', () => {
            // @ts-expect-error
            valid.value = validator.valid()
        })
        .on('touchedChanged', () => {
            // @ts-expect-error
            touched.value = validator.touched()
        })
        .on('errorsChanged', () => {
            form.hasErrors = validator.hasErrors()

            // @ts-expect-error
            form.errors = toSimpleValidationErrors(validator.errors())

            // @ts-expect-error
            valid.value = validator.valid()
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
    let form: Data&Form<Data> = {
        ...cloneDeep(originalData),
        data() {
            const data = cloneDeep(toRaw(form))

            return originalInputs.reduce<Partial<Data>>((carry, name) => ({
                ...carry,
                [name]: data[name],
            }), {}) as Data
        },
        setData(data: Record<string, unknown>) {
            Object.keys(data).forEach(input => {
                // @ts-expect-error
                form[input] = data[input]
            })

            return form
        },
        touched(name) {
            // @ts-expect-error
            return touched.value.includes(name)
        },
        touch(name) {
            validator.touch(name)

            return form
        },
        validate(name, config) {
            if (typeof name === 'object') {
                return validator.validate(name)
            }

            // @ts-expect-error
            name = resolveName(name)

            return validator.validate(name, get(form.data(), name), config)
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
        forgetError(name) {
            // @ts-expect-error
            validator.forgetError(name)

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

            // @ts-expect-error
            validator.reset(...names)

            return form
        },
        setValidationTimeout(duration) {
            validator.setTimeout(duration)

            return form
        },
        processing: false,
        submit(config = {}) {
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

    form = reactive(form) as Data&Form<Data>

    return form
}
