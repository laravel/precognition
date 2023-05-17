import precognitive, {toSimpleValidationErrors} from 'laravel-precognition'
import { Config, NamedInputEvent, RequestMethods, SimpleValidationErrors, Timeout, ValidationErrors } from 'laravel-precognition'
import { computed, reactive, ref } from 'vue'
import cloneDeep from 'lodash.clonedeep'
import {PrecognitiveForm} from './types'

export const useForm = <TForm extends Record<string, unknown>>(method: RequestMethods, url: string, data?: TForm, config?: Config): PrecognitiveForm => {
    /**
     * The original user supplied data.
     */
    const defaults = cloneDeep(data ?? {})

    /**
     * The form instance...
     */
    let form: Partial<PrecognitiveForm<TForm>> = reactive(defaults ?? {})

    /**
     * Base validator.
     */
    const validator = precognitive.validate(client => {
        const m = method.toLowerCase() as RequestMethods

        return m === 'get' || m === 'delete' ? client[m](url, config) : client[m](url, form.data(), config)
    })

    /**
     * Reactive validating state.
     */
    const validating = ref<string|null>(validator.validating())

    validator.on('validatingChanged', () => validating.value = validator.validating())

    /**
     * Reactive processing validation state.
     */
    const processingValidation = ref<boolean>(validator.processingValidation())

    validator.on('processingValidationChanged', () => processingValidation.value = validator.processingValidation())

    /**
     * Reactive touched inputs state.
     */
    const touched = ref<Array<string>>(validator.touched())

    validator.on('touchedChanged', () => touched.value = validator.touched())

    /**
     * Reactive passed validation state.
     */
    const passed = computed<Array<string>>(() => touched.value.filter(
        (name: string) => typeof form.errors[name] === 'undefined'
    ))

    /**
     * Reactive errors state.
     */
    const errors = ref<SimpleValidationErrors>(toSimpleValidationErrors(validator.errors()))

    validator.on('errorsChanged', () => errors.value = toSimpleValidationErrors(validator.errors()))

    /**
     * Reactive hasErrors state.
     */
    const hasErrors = computed<boolean>(() => Object.keys(errors.value).length > 0)

    return Object.assign(form, {
        validate(input: string|NamedInputEvent) {
            validator.validate(input)

            return this
        },
        validating(name?: string) {
            if (typeof name !== 'string') {
                return
                // touched diff passed
            }

            return this.touched.value.includes(name) && this.
        },
        processingValidation,
        passed,
        touched,
        errors,
        hasErrors,
        setErrors(errors: ValidationErrors|SimpleValidationErrors) {
            validator.setErrors(errors)

            return this
        },
        clearErrors() {
            validator.clearErrors()

            return this
        },
        setValidationTimeout(timeout: Timeout) {
            validator.setTimeout(timeout)

            return this
        },
        data(): TForm {
            return (Object.keys(defaults) as Array<keyof TForm>).reduce((carry, key) => ({
                ...carry,
                [key]: this[key],
            }), {} as Partial<TForm>) as TForm
        },
        reset(...keys: string[]) {
            const clonedDefaults = cloneDeep(defaults)

            keys = keys.length === 0
                ? Object.keys(defaults)
                : keys

            keys.forEach(key => {
                form[key] = clonedDefaults[key]
            })

            return this
        },
        submit: async (config?: any): Promise<unknown> => precognitive.axios()[method](url, this.data(), config)
            .catch((error: any) => {
                if (error.response?.status === 422) {
                    this.setErrors(error.response.data.errors)
                }

                return Promise.reject(error)
            })
}

export { precognitive as default }
