import { Config, NamedInputEvent, RequestMethod, SimpleValidationErrors, toSimpleValidationErrors, ValidationConfig, ValidationErrors, resolveUrl, resolveMethod } from 'laravel-precognition'
import { useForm as usePrecognitiveForm, client } from 'laravel-precognition-vue'
import { useForm as useInertiaForm } from '@inertiajs/vue3'
import { watchEffect } from 'vue'
import {isAxiosError} from 'axios'

export { client }

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod|(() => RequestMethod), url: string|(() => string), inputs: Data, config: ValidationConfig = {}): any => {
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
        validate(name?: string|NamedInputEvent|ValidationConfig, config?: ValidationConfig) {
            if (typeof name === 'object' && !('target' in name)) {
                config = name
                name = undefined
            }

            precognitiveForm.setData(inertiaForm.data())

            // @ts-expect-error
            if (typeof config === 'object' && config.onError) {
                // TODO shoult this decorate?
                // @ts-expect-error
                config.onValidationError = config.onValidationError ?? config?.onError
            }

            precognitiveForm.validate(name, config).catch((e) => {
                // Unlike other status codes, 422 responses are expected and
                // constant behaviour for Precognition requests.  Although
                // slightly inconsistent with other response codes, we will
                // silently ignore these. They should be intercepted by the
                // `onError` or `onValidationError` config option.
                if (isAxiosError(e) && e.response?.status === 422) {
                    return
                }

                throw e
            })
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

    // Due to the nature of `reactive` elements, reactivity is not inherited by
    // the patched Inertia form as we have to destructure the Precog form. We
    // can handle this by watching for changes and apply the changes manually.
    watchEffect(() => form.validating = precognitiveForm.validating)

    return form
}
