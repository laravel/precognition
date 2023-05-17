import { Config, RequestMethod, client, toSimpleValidationErrors } from 'laravel-precognition'
import { reactive, ref } from 'vue'
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
     * Reactive passed validation state.
     */
    const passed = ref(validator.passed())

    validator.on('touchedChanged', () => passed.value = validator.passed())

    validator.on('errorsChanged', () => passed.value = validator.passed())

    /**
     * The valid / invalid helpers.
     */
    const valid = (name: string) => passed.value.includes(name)

    const invalid = (name: string) => typeof errors.value[name] !== 'undefined'

    /**
     * Reactive errors state.
     */
    const errors = ref(toSimpleValidationErrors(validator.errors()))

    validator.on('errorsChanged', () => errors.value = toSimpleValidationErrors(validator.errors()))

    /**
     * Reactive hasErrors state.
     */
    const hasErrors = ref(validator.hasErrors())

    validator.on('errorsChanged', () => hasErrors.value = validator.hasErrors())

    /**
     * The form reset helper.
     */
    const reset = (...keys: string[]) => {
        const clonedDefaults = cloneDeep(defaults)

        keys = keys.length === 0
            ? Object.keys(defaults)
            : keys

        keys.forEach(key => {
            form[key] = clonedDefaults[key]
        })

        validator.setErrors({})
        validator.
    }

    /**
     * Submit the form.
     */
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
        data,
        submit,
        validating,
        errors,
        hasErrors,
        valid,
        invalid,
        validate(input) {
            validator.validate(input)

            return this
        },
        setErrors(errors) {
            validator.setErrors(errors)

            return this
        },
        clearErrors() {
            return this.setErrors({})
        },
        setValidationTimeout(timeout) {
            validator.setTimeout(timeout)

            return this
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
}
