import { SimpleValidationErrors, ValidationErrors } from 'laravel-precognition'

export type StringKeyOf<Type> = Extract<Type, string>

export interface Form<Data extends Record<string, unknown>> {
    data(): Data,
    validating: boolean,
    errors: Record<StringKeyOf<Data>, string>,
    hasErrors: boolean,
    valid(name: StringKeyOf<Data>): boolean,
    invalid(name: StringKeyOf<Data>): boolean,
    validate(name: StringKeyOf<Data>): Form<Data>,
    setErrors(errors: SimpleValidationErrors|ValidationErrors): Form<Data>,
    clearErrors(): Form<Data>,
    setValidationTimeout(duration: number): Form<Data>,
    submit(): Promise<unknown>,
    reset(...keys: (StringKeyOf<Data>)[]): Form<Data>,
}
