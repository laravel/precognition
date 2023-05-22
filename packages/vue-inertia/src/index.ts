import { Config, NamedInputEvent, RequestMethod, SimpleValidationErrors, toSimpleValidationErrors, ValidationConfig, ValidationErrors } from 'laravel-precognition'
import { useForm as useVueForm } from 'laravel-precognition-vue'
import { useForm as useInertiaForm } from '@inertiajs/vue3'

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod, url: string, inputs: Data, config: ValidationConfig = {}): any => {
    /**
     * The Inertia form.
     */
    const inertiaForm = useInertiaForm(inputs)

    /**
     * The Precognitive form.
     */
    const precognitiveForm = useVueForm(method, url, inputs, config)

    /**
     * Setup event listeners.
     */
    precognitiveForm.validator().on('errorsChanged', () => {
        inertiaClearErrors()

        inertiaSetError(
            // @ts-expect-error
            toSimpleValidationErrors(precognitiveForm.validator().errors())
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
        processing: precognitiveForm.processing,
        validating: precognitiveForm.validating,
        touched: precognitiveForm.touched,
        valid: precognitiveForm.valid,
        invalid: precognitiveForm.invalid,
        clearErrors() {
            inertiaClearErrors()

            precognitiveForm.setErrors({})

            return this
        },
        reset(...names: string[]) {
            inertiaReset(...names)

            precognitiveForm.reset(...names)
        },
        setErrors(errors: SimpleValidationErrors|ValidationErrors) {
            // @ts-expect-error
            precognitiveForm.setErrors(errors)

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
            precognitiveForm.setData(inertiaForm.data())

            precognitiveForm.validate(name)

            return this
        },
        setValidationTimeout(duration: number) {
            precognitiveForm.setValidationTimeout(duration)

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
                    precognitiveForm.validator().setErrors(errors)

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
