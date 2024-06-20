import { Config, NamedInputEvent, RequestMethod, SimpleValidationErrors, toSimpleValidationErrors, ValidationConfig, ValidationErrors, resolveUrl, resolveMethod, Validator } from 'laravel-precognition'
import { useForm as usePrecognitiveForm, client }      from 'laravel-precognition-vue'
import { InertiaForm, useForm as useInertiaForm }        from '@inertiajs/vue3'
import { Progress } from '@inertiajs/core'
import { watchEffect } from 'vue'

export { client }

type FormDataType = object;

interface FormProps<TForm extends FormDataType> {
    validating: boolean,
    touched(name: string): boolean,
    touch(name: string | string[] | NamedInputEvent): this;
    progress: Progress | null;
    valid(name: string | NamedInputEvent | string[]): boolean,
    invalid(name: string): boolean,
    clearErrors(...fields: (keyof TForm)[]) : this,
    reset(...fields: (keyof TForm)[]) : void,
    setErrors(errors: SimpleValidationErrors|ValidationErrors) : this;
    forgetError(name: string|NamedInputEvent): this;
    setError(field: keyof TForm, value: string): this;
    transform(callback: (data: FormDataType) => Record<string, unknown>) : this;
    validate(name?: string|NamedInputEvent): this;
    setValidationTimeout(duration: number): this;
    validateFiles(): this;
    submit(submitMethod?: RequestMethod|Config, submitUrl?: string, submitOptions?: any): void
    validator(): Validator;
}

export type PrecognitionFormProps<TForm extends FormDataType> = FormProps<TForm> & InertiaForm<TForm>


export const useForm = <Data extends FormDataType>(method: RequestMethod|(() => RequestMethod), url: string|(() => string), inputs: Data, config: ValidationConfig = {}): PrecognitionFormProps<Data> => {
    /**
     * The Inertia form.
     */
    const inertiaForm = useInertiaForm(inputs)

    /**
     * The Precognitive form.
     */
    const precognitiveForm = usePrecognitiveForm(method, url, inputs as Record<string, unknown>, config)

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
     * The Inertia trasform function.
     */
    const inertiaTransform = inertiaForm.transform.bind(inertiaForm)

    /**
     * The transform function.
     */
    let transformer: (data: Data) => FormDataType = (data) => data

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
        clearErrors(...fields: (keyof Data)[]) {
            inertiaClearErrors(...fields)

            if (fields.length === 0) {
                precognitiveForm.setErrors({})
            } else {
                // @ts-expect-error
                fields.forEach(precognitiveForm.forgetError)
            }

            return form
        },
        reset(...fields: (keyof Data)[]) {
            inertiaReset(...fields)

            precognitiveForm.reset(...fields as string[])
        },
        setErrors(errors: SimpleValidationErrors|ValidationErrors) {
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
        transform(callback: (data: Data) => Record<string, unknown>) {
            inertiaTransform(callback)

            transformer = callback

            return form
        },
        validate(name?: string|NamedInputEvent) {
            precognitiveForm.setData(inertiaForm.data() as Record<string, unknown>)

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

            inertiaSubmit(submitMethod, submitUrl as string, {
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
