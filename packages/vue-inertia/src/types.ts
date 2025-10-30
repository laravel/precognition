import { NamedInputEvent, RequestMethod, SimpleValidationErrors, ValidationConfig, ValidationErrors } from 'laravel-precognition'
import { Form as PrecognitiveForm } from 'laravel-precognition-vue/dist/types'
import { InertiaForm } from '@inertiajs/vue3'
import { FormDataErrors, VisitOptions } from '@inertiajs/core'

type RedefinedProperties = 'setErrors' | 'touch' | 'forgetError' | 'setValidationTimeout' | 'submit' | 'reset' | 'validateFiles' | 'setData' | 'validate'

export type Form<Data extends Record<string, FormDataConvertible>> = Omit<PrecognitiveForm<Data>, RedefinedProperties> & InertiaForm<Data> & {
    setErrors(errors: SimpleValidationErrors | ValidationErrors): Data & Form<Data>,
    touch(name: Array<string> | string | NamedInputEvent): Data & Form<Data>,
    forgetError(string: keyof Data | NamedInputEvent): Data & Form<Data>,
    setValidationTimeout(duration: number): Data & Form<Data>,
    submit(config?: Partial<VisitOptions>): void,
    submit(method: RequestMethod, url: string, options?: Partial<VisitOptions>): void,
    reset(...keys: (keyof Partial<Data>)[]): Data & Form<Data>,
    validateFiles(): Data & Form<Data>,
    disableFileValidation(): Data & Form<Data>,
    setData(data: Record<string, FormDataConvertible>): Data & Form<Data>,
    validate(name?: (keyof Data | NamedInputEvent) | ValidationConfig, config?: ValidationConfig): Data & Form<Data>,
}

// This type has been duplicated from @inertiajs/core to
// continue supporting Inertia 1. When we drop version 1
// support we can import this directly from Inertia.
export type FormDataConvertible = Array<FormDataConvertible> | {
    [key: string]: FormDataConvertible;
} | Blob | FormDataEntryValue | Date | boolean | number | null | undefined;
