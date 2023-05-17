import { Config, NamedInputEvent, RequestMethod, SimpleValidationErrors, ValidationErrors, client, toSimpleValidationErrors } from 'laravel-precognition'
import { computed, reactive, ref } from 'vue'
import cloneDeep from 'lodash.clonedeep'

export const useForm = (method: RequestMethod, url: string, input: Record<string, unknown> = {}, config: Config = {}): any => {
    method = method.toLowerCase() as RequestMethod

    /**
     * The original user supplied data.
     */
    const defaults = cloneDeep(input)

    /**
     * The form instance.
     */
    let form = reactive(defaults)

    /**
     * The form's data.
     */
    const data = () => Object.keys(defaults).reduce((carry, key) => ({
        ...carry,
        [key]: form[key],
    }), {})

    /**
     * The validator instance.
     */
    const validator = client.validator(client => method === 'get' || method === 'delete'
        ? client[method](url, config)
        : client[method](url, data(), config))

    /**
     * Reactive validating state.
     */
    const validating = ref(validator.validating())

    validator.on('validatingChanged', () => validating.value = validator.validating())

    /**
     * Reactive touched inputs state.
     */
    const touched = ref(validator.touched())

    validator.on('touchedChanged', () => touched.value = validator.touched())

    /**
     * Reactive errors state.
     */
    const errors = ref(toSimpleValidationErrors(validator.errors()))

    validator.on('errorsChanged', () => errors.value = toSimpleValidationErrors(validator.errors()))

    /**
     * Reactive hasErrors state.
     */
    const hasErrors = computed(() => Object.keys(errors.value).length > 0)

    /**
     * Reactive passed validation state.
     */
    const passed = computed(() => touched.value.filter(
        (name: string) => typeof errors.value[name] === 'undefined'
    ))

    const submit = async (userConfig: Config = {}): Promise<unknown> => {
        const config: Config = {
            ...userConfig,
            onValidationError: (response, error) => {
                validator.setErrors(response.data.errors)

                return userConfig.onValidationError
                    ? userConfig.onValidationError(response)
                    : Promise.reject(error)
            }
        }

        return method === 'get' || method === 'delete'
            ? client[method](url, config)
            : client[method](url, data(), config)
    }

    return Object.assign(form, {
        submit,
        validate(input: string|NamedInputEvent) {
            validator.validate(input)

            return this
        },
        validating,
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
        setValidationTimeout(timeout: number) {
            validator.setTimeout(timeout)

            return this
        },
        data,
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
}
