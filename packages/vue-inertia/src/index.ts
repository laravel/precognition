import {Config, RequestMethod, SimpleValidationErrors, toSimpleValidationErrors, ValidationConfig} from 'laravel-precognition'
import { useForm as useVueForm } from 'laravel-precognition-vue'
import { useForm as useInertiaForm } from '@inertiajs/vue3'

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod, url: string, inputs: Data, config: ValidationConfig = {}): any => {
    /**
     * The Inertia form.
     */
    const inertiaForm = useInertiaForm(inputs)

    /**
     * The Vue form.
     */
    const vueForm = useVueForm(method, url, inputs, config)

    /**
     * Setup event listeners.
     */
    vueForm.validator().on('errorsChanged', () => inertiaForm.clearErrors().setError(
        // @ts-expect-error
        toSimpleValidationErrors(vueForm.validator().errors())
    ))

    /**
     * The Inertia submit function.
     */
    const inertiaSubmit = inertiaForm.submit.bind(inertiaForm)

    /**
     * Patch the form.
     */
    return Object.assign(inertiaForm, {
        processing: vueForm.processing,
        validating: vueForm.validating,
        touched: vueForm.touched,
        valid: vueForm.valid,
        invalid: vueForm.invalid,
        validate: vueForm.validate,
        setValidationTimeout: vueForm.setValidationTimeout,
        submit: (submitMethod: RequestMethod|Config = {}, submitUrl?: string, submitOptions?: any): void => {
            const isPatchedCall = typeof submitMethod !== 'string'

            const options = {
                ...isPatchedCall
                    ? submitMethod
                    : submitOptions,
                onError: (errors: SimpleValidationErrors): any => {
                    vueForm.validator().setErrors(errors)

                    if (submitOptions.onError) {
                        return submitOptions.onError(errors)
                    }
                },
            }

            inertiaSubmit(
                isPatchedCall ? method : submitMethod,
                // @ts-expect-error
                (isPatchedCall ? url : submitUrl),
                options
            )
        }
    })
}
