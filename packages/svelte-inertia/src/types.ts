import { VisitOptions } from '@inertiajs/core'
import { InertiaForm } from '@inertiajs/svelte'
import {
    client,
    RequestMethod,
    SimpleValidationErrors,
    ValidationErrors,
    type NamedInputEvent,
    type ValidationConfig,
} from 'laravel-precognition'
import { Form as PrecognitiveForm } from 'laravel-precognition-svelte/dist/types'
export { client }

type RedefinedProperties =
    | 'setErrors'
    | 'touch'
    | 'forgetError'
    | 'setValidationTimeout'
    | 'submit'
    | 'reset'
    | 'validateFiles'
    | 'setData'
    | 'validate'

export type Form<Data extends Record<string, FormDataConvertible>> = Omit<PrecognitiveForm<Data>, RedefinedProperties> &
    Omit<InertiaForm<Data>, RedefinedProperties> & {
        setErrors(errors: SimpleValidationErrors | ValidationErrors): Form<Data>
        touch(name: Array<string> | string | NamedInputEvent): Form<Data>
        forgetError(string: keyof Data | NamedInputEvent): Form<Data>
        setValidationTimeout(duration: number): Form<Data>
        submit(config?: Partial<VisitOptions>): void
        submit(method: RequestMethod, url: string, options?: Omit<VisitOptions, 'data'>): void
        reset(...keys: (keyof Partial<Data>)[]): void
        validateFiles(): Form<Data>
        validate(name?: (keyof Data | NamedInputEvent) | ValidationConfig, config?: ValidationConfig): Form<Data>
        valid: (name: keyof Data) => boolean
        invalid: (name: keyof Data) => boolean
    }

export type FormDataConvertible =
    | Array<FormDataConvertible>
    | { [key: string]: FormDataConvertible }
    | Blob
    | FormDataEntryValue
    | Date
    | boolean
    | number
    | null
    | undefined
