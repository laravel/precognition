import { Config, NamedInputEvent, RequestMethod, SimpleValidationErrors, toSimpleValidationErrors, ValidationConfig, ValidationErrors, resolveUrl, resolveMethod } from 'laravel-precognition'
import { useForm as usePrecognitiveForm, client, Form } from 'laravel-precognition-vue'
import { useForm as useInertiaForm, InertiaForm } from '@inertiajs/vue3'

export { client }

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod|(() => RequestMethod), url: string|(() => string), inputs: Data, config: ValidationConfig = {}): InertiaForm<Data> & Form<Data> => {
    /**
     * The Inertia form.
     */
    const inertiaForm = useInertiaForm(inputs)

    /**
     * The Precognitive form.
     */
    const precognitiveForm = usePrecognitiveForm(method, url, inputs, config)

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
    const form = Object.assign(inertiaForm, {
        validating: precognitiveForm.validating,
        touched: precognitiveForm.touched,
        touch(name: Array<string>|string|NamedInputEvent) {
            precognitiveForm.touch(name)

            return form
        },
        valid: precognitiveForm.valid,
        invalid: precognitiveForm.invalid,
        clearErrors(...names: string[]) {
            inertiaClearErrors(...names)

            if (names.length === 0) {
                precognitiveForm.setErrors({})
            } else {
                names.forEach(precognitiveForm.forgetError)
            }

            return form
        },
        reset(...names: string[]) {
            inertiaReset(...names)

            precognitiveForm.reset(...names)
        },
        setErrors(errors: SimpleValidationErrors|ValidationErrors) {
            // @ts-expect-error
            precognitiveForm.setErrors(errors)

            return form
        },
        forgetError(name: string|NamedInputEvent) {
            precognitiveForm.forgetError(name)

            return form
        },
        setError(key: any, value?: any) {
            form.setErrors({
                ...inertiaForm.errors,
                ...typeof value === 'undefined'
                    ? key
                    : { [key]: value },
            })

            return form
        },
        validate(name?: string|NamedInputEvent) {
            precognitiveForm.setData(inertiaForm.data())

            precognitiveForm.validate(name)

            return form
        },
        setValidationTimeout(duration: number) {
            precognitiveForm.setValidationTimeout(duration)

            return form
        },
        validateFiles() {
            precognitiveForm.validateFiles()

            return form
        },
        submit(submitMethod: RequestMethod|Config = {}, submitUrl?: string, submitOptions?: any): void {
            const isPatchedCall = typeof submitMethod !== 'string'

            submitOptions = isPatchedCall
                ? submitMethod
                : submitOptions

            submitUrl = isPatchedCall
                ? resolveUrl(url)
                : submitUrl!

            submitMethod = isPatchedCall
                ? resolveMethod(method)
                : submitMethod as RequestMethod

            inertiaSubmit(submitMethod, submitUrl, {
                ...submitOptions,
                onError: (errors: SimpleValidationErrors): any => {
                    precognitiveForm.validator().setErrors(errors)

                    if (submitOptions.onError) {
                        return submitOptions.onError(errors)
                    }
                },
            })
        },
        validator: precognitiveForm.validator,
    })

    return form
}
