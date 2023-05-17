import { RequestMethods, SimpleValidationErrors, ValidationErrors, Validator } from 'laravel-precognition/dist/types'
import precognitive, { toSimpleValidationErrors } from 'laravel-precognition'
import { computed, ref } from 'vue'
import cloneDeep from 'lodash.clonedeep'

export const patchVueForm = (method: RequestMethods, url: string, defaults: Record<string, unknown>, form: any, validator: Validator) => {
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
        data(): any {
            return Object.keys(defaults).reduce((carry, key) => ({
                ...carry,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore-next-line
                [key]: this[key],
            }), {})
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
        async submit(config?: any): Promise<unknown> {
            return precognitive.axios()[method](url, this.data(), config).catch((error: any) => {
                if (error.response?.status === 422) {
                    this.setErrors(error.response.data.errors)
                }

                return Promise.reject(error)
            })
        },
    })
}

