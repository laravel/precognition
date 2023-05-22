import { Config, NamedInputEvent, RequestMethod, SimpleValidationErrors, toSimpleValidationErrors, ValidationConfig, ValidationErrors } from 'laravel-precognition'
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
    vueForm.validator().on('errorsChanged', () => {
        inertiaClearErrors()

        inertiaSetError(
            // @ts-expect-error
            toSimpleValidationErrors(vueForm.validator().errors())
        )
    })

    /**
     * The Inertia submit function.
     */
    const inertiaSubmit = inertiaForm.submit.bind(inertiaForm)

    /**
     * The Inertia reset function.
     */
    const inertiaReset = inertiaForm.reset.bind(inertiaForm)

    /**
     * The Inertia clear errors function.
     */
    const inertiaClearErrors = inertiaForm.clearErrors.bind(inertiaForm)

    /**
     * The Inertia set error function.
     */
    const inertiaSetError = inertiaForm.setError.bind(inertiaForm)

    /**
     * Patch the form.
     */
    return Object.assign(inertiaForm, {
        processing: vueForm.processing,
        validating: vueForm.validating,
        touched: vueForm.touched,
        valid: vueForm.valid,
        invalid: vueForm.invalid,
        clearErrors() {
            inertiaClearErrors()

            vueForm.setErrors({})

            return this
        },
        reset(...names: string[]) {
            inertiaReset(...names)

            vueForm.reset(...names)
        },
        setErrors(errors: SimpleValidationErrors|ValidationErrors) {
            // @ts-expect-error
            vueForm.setErrors(errors)

            return this
        },
        setError(key: any, value?: any) {
            this.setErrors({
                ...inertiaForm.errors,
                ...typeof value === 'undefined'
                    ? key
                    : { [key]: value }
            })

            return this
        },
        validate(name: string|NamedInputEvent) {
            vueForm.setData(inertiaForm.data())

            vueForm.validate(name)

            return this
        },
        setValidationTimeout(duration: number) {
            vueForm.setValidationTimeout(duration)

            return this
        },
        submit(submitMethod: RequestMethod|Config = {}, submitUrl?: string, submitOptions?: any): void {
            const isPatchedCall = typeof submitMethod !== 'string'

            const userOptions = isPatchedCall
                ? submitMethod
                : submitOptions

            const options = {
                ...userOptions,
                onError: (errors: SimpleValidationErrors): any => {
                    vueForm.validator().setErrors(errors)

                    if (userOptions.onError) {
                        return userOptions.onError(errors)
                    }
                },
            }

            inertiaSubmit(
                isPatchedCall ? method : submitMethod,
                // @ts-expect-error
                (isPatchedCall ? url : submitUrl),
                options
            )
        },
    })
}
