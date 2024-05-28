import { Config, NamedInputEvent, RequestMethod, SimpleValidationErrors, toSimpleValidationErrors, ValidationConfig, ValidationErrors, resolveUrl, resolveMethod } from 'laravel-precognition'
import { useForm as usePrecognitiveForm, client } from 'laravel-precognition-react'
import { useForm as useInertiaForm } from '@inertiajs/react'
import { useRef } from 'react'

export { client }

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod|(() => RequestMethod), url: string|(() => string), inputs: Data, config: ValidationConfig = {}): any => {
    const booted = useRef<boolean>(false)

    /**
     * The Inertia form.
     */
    const inertiaForm = useInertiaForm(inputs)

    /**
     * The React form.
     */
    const precognitiveForm = usePrecognitiveForm(method, url, inputs, config)

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
     * The Inertia set data function.
     */
    const inertiaSetData = inertiaForm.setData.bind(inertiaForm)

    if (! booted.current) {
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

        booted.current = true
    }

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
        setData(key: any, value?: any) {
            inertiaSetData(key, value)

            precognitiveForm.setData(key, value)

            return form
        },
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
        setError(key: any, value?: any) {
            form.setErrors({
                ...inertiaForm.errors,
                ...typeof value === 'undefined'
                    ? key
                    : { [key]: value },
            })

            return form
        },
        forgetError(name: string|NamedInputEvent) {
            precognitiveForm.forgetError(name)

            return form
        },
        validate(name?: string|NamedInputEvent) {
            precognitiveForm.setData(inertiaForm.data)

            return precognitiveForm.validate(name)
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
