import { NamedInputEvent, RequestMethod, SimpleValidationErrors, ValidationConfig, ValidationErrors } from 'laravel-precognition'
import { Form as PrecognitiveForm } from 'laravel-precognition-react/dist/types'
import { InertiaFormProps } from '@inertiajs/react'
import { VisitOptions } from '@inertiajs/core'

type RedefinedProperties = 'setErrors' | 'touch' | 'forgetError' | 'setValidationTimeout' | 'submit' | 'reset' | 'validateFiles' | 'setData' | 'validate'

export type Form<Data extends Record<string, FormDataConvertible>> = Omit<PrecognitiveForm<Data>, RedefinedProperties> & InertiaFormProps<Data> & {
    setErrors(errors: SimpleValidationErrors | ValidationErrors): Form<Data>,
    touch(name: Array<string> | string | NamedInputEvent): Form<Data>,
    forgetError(string: keyof Data | NamedInputEvent): Form<Data>,
    setValidationTimeout(duration: number): Form<Data>,
    submit(config?: Partial<VisitOptions>): void,
    submit(method: RequestMethod, url: string, options?: Partial<VisitOptions>): void,
    reset(...keys: (keyof Partial<Data>)[]): void,
    validateFiles(): Form<Data>,
    setData(data: Record<string, FormDataConvertible>): Form<Data>,
    validate(name?: (keyof Data | NamedInputEvent) | ValidationConfig, config?: ValidationConfig): Form<Data>,
}

// This type has been duplicated from @inertiajs/core to
// continue supporting Inertia 1. When we drop version 1
// support we can import this directly from Inertia.
export type FormDataConvertible = Array<FormDataConvertible> | {
    [key: string]: FormDataConvertible;
} | Blob | FormDataEntryValue | Date | boolean | number | null | undefined;

