import { NamedInputEvent, RequestMethod, SimpleValidationErrors, toSimpleValidationErrors, ValidationConfig, ValidationErrors, resolveUrl, resolveMethod } from 'laravel-precognition'
import { useForm as usePrecognitiveForm, client } from 'laravel-precognition-vue'
import { useForm as useInertiaForm } from '@inertiajs/vue3'
import { VisitOptions } from '@inertiajs/core'
import { watchEffect } from 'vue'
import { Form } from './types'

export { client }

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod | (() => RequestMethod), url: string | (() => string), inputs: Data | (() => Data), config: ValidationConfig = {}): Form<Data> => {
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
            toSimpleValidationErrors(precognitiveForm.validator().errors()),
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
     * The Inertia trasform function.
     */
    const inertiaTransform = inertiaForm.transform.bind(inertiaForm)

    /**
     * The transform function.
     */
    let transformer: (data: Data) => Record<string, unknown> = (data) => data

    /**
     * Patch the form.
     */
    const form: Form<Data> = Object.assign(inertiaForm, {
        validating: precognitiveForm.validating,
        touched: precognitiveForm.touched,
        touch(name: Array<string> | string | NamedInputEvent) {
            precognitiveForm.touch(name)

            return form
        },
        valid: precognitiveForm.valid,
        invalid: precognitiveForm.invalid,
        setData(data: Record<string, unknown>) {
            Object.keys(data).forEach((input) => {
                // @ts-expect-error
                form[input] = data[input]
            })

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
        setErrors(errors: SimpleValidationErrors | ValidationErrors) {
            // @ts-expect-error
            precognitiveForm.setErrors(errors)

            return form
        },
        forgetError(name: string | NamedInputEvent) {
            precognitiveForm.forgetError(name)

            return form
        },
        setError(key: (keyof Data) | Record<keyof Data, string>, value?: string) {
            let errors: SimpleValidationErrors

            if (typeof key !== 'object') {
                if (typeof value === 'undefined') {
                    throw new Error('The `value` is required.')
                }

                errors = { [key]: value }
            } else {
                errors = key
            }

            form.setErrors({
                ...inertiaForm.errors,
                ...errors,
            })

            return form
        },
        transform(callback: (data: Data) => Record<string, unknown>) {
            inertiaTransform(callback)

            transformer = callback

            return form
        },
        validate(name?: string | NamedInputEvent | ValidationConfig, config?: ValidationConfig) {
            precognitiveForm.setData(transformer(inertiaForm.data()))

            if (typeof name === 'object' && !('target' in name)) {
                config = name
                name = undefined
            }

            if (typeof config === 'object') {
                // @ts-expect-error
                config.onValidationError = config.onValidationError ?? config?.onError
            }

            if (typeof name === 'undefined') {
                precognitiveForm.validate(config)
            } else {
                precognitiveForm.validate(name, config)
            }

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
        submit(submitMethod: RequestMethod | Partial<VisitOptions> = {}, submitUrl?: string, submitOptions?: Partial<VisitOptions>): void {
            if (typeof submitMethod !== 'string') {
                submitOptions = submitMethod
                submitUrl = resolveUrl(url)
                submitMethod = resolveMethod(method)
            }

            inertiaSubmit(submitMethod, submitUrl!, {
                ...submitOptions,
                onError: (errors: SimpleValidationErrors): void => {
                    precognitiveForm.validator().setErrors(errors)

                    if (submitOptions?.onError) {
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
