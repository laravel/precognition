import { FormDataConvertible, VisitOptions } from '@inertiajs/core'
import { useForm as useInertiaForm } from '@inertiajs/svelte'
import {
    client,
    NamedInputEvent,
    RequestMethod,
    resolveMethod,
    resolveUrl,
    SimpleValidationErrors,
    toSimpleValidationErrors,
    ValidationConfig,
    ValidationErrors,
} from 'laravel-precognition'
import { useForm as usePrecognitiveForm } from 'laravel-precognition-svelte'
import { fromStore, get, writable, Writable } from 'svelte/store'
import { Form } from './types'

export { client }

export const useForm = <Data extends Record<string, FormDataConvertible>>(
    method: RequestMethod | (() => RequestMethod),
    url: string | (() => string),
    inputs: Data,
    config: ValidationConfig = {},
): Writable<Form<Data>> => {
    /**
     * The Inertia form.
     */
    const inertiaForm = useInertiaForm(inputs)

    /**
     * The React form.
     */
    const precognitiveForm = usePrecognitiveForm(method, url, inputs, config)

    /**
     * The transform function.
     */
    let transformer: (data: Data) => Data = (data) => data

    /**
     * Patch the form.
     */
    const form = writable({
        ...fromStore(inertiaForm).current,
        validating: false,
        touched: precognitiveForm.touched,
        touch(name: Array<string> | string | NamedInputEvent) {
            precognitiveForm.touch(name)

            return get(form)
        },
        valid: precognitiveForm.valid,
        invalid: precognitiveForm.invalid,
        errors: precognitiveForm.errors,
        clearErrors(...names: string[]) {
            form.update((prev) => {
                names.forEach((name) => delete prev.errors[name])

                return prev
            })

            if (names.length === 0) {
                precognitiveForm.setErrors({})
            } else {
                names.forEach(precognitiveForm.forgetError)
            }

            return get(form)
        },
        reset(...names: string[]) {
            // inertiaReset(...names)

            precognitiveForm.reset(...names)
        },
        setErrors(errors: SimpleValidationErrors | ValidationErrors) {
            // @ts-ignore
            precognitiveForm.setErrors(errors)

            return get(form)
        },
        setError(key: any, value?: any) {
            // @ts-ignore
            form.update((prev) => ({
                ...prev,
                errors: { ...prev.errors, ...(typeof value === 'undefined' ? key : { [key]: value }) },
            }))

            return get(form)
        },
        forgetError(name: string | NamedInputEvent) {
            precognitiveForm.forgetError(name)

            return get(form)
        },
        transform(callback: (data: Data) => Data) {
            form.update((prev) => {
                prev.transform(callback)

                return prev
            })

            transformer = callback

            return get(form)
        },
        validate(name?: keyof Data | NamedInputEvent | ValidationConfig, config?: ValidationConfig) {
            precognitiveForm.setData(transformer(get(form).data()))

            if (typeof name === 'object' && !('target' in name)) {
                config = name
                name = undefined
            }

            if (typeof name === 'undefined') {
                precognitiveForm.validate(config)
            } else {
                precognitiveForm.validate(name, config)
            }

            return get(form)
        },
        setValidationTimeout(duration: number) {
            precognitiveForm.setValidationTimeout(duration)

            return get(form)
        },
        validateFiles() {
            precognitiveForm.validateFiles()

            return get(form)
        },
        submit(
            submitMethod: RequestMethod | Partial<VisitOptions> = {},
            submitUrl?: string,
            submitOptions?: Partial<VisitOptions>,
        ): void {
            if (typeof submitMethod !== 'string') {
                submitOptions = submitMethod
                submitUrl = resolveUrl(url)
                submitMethod = resolveMethod(method)
            }

            inertiaForm.update((prev) => ({
                ...prev,
                ...get(form).data(),
            }))

            get(inertiaForm).submit(submitMethod, submitUrl!, {
                ...submitOptions,
                onError: (errors: SimpleValidationErrors): any => {
                    precognitiveForm.validator().setErrors(errors)

                    if (submitOptions?.onError) {
                        return submitOptions.onError(errors)
                    }
                },
            })
        },
        validator: precognitiveForm.validator,
    })

    /**
     * Setup event listeners.
     */
    form.subscribe((value) => precognitiveForm.setData(value.data()))

    precognitiveForm
        .validator()
        .on('errorsChanged', () => {
            // @ts-ignore
            form.update((prev) => ({
                ...prev,
                errors: toSimpleValidationErrors(precognitiveForm.validator().errors()),
            }))
        })
        .on('validatingChanged', () => {
            form.update((prev) => ({
                ...prev,
                validating: precognitiveForm.validating,
            }))
        })

    return form
}
