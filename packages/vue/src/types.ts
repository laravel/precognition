import { Config, SimpleValidationErrors, ValidationErrors } from 'laravel-precognition'

export type StringKeyOf<Type> = Extract<Type, string>

export interface Form<Data extends Record<string, unknown>> {
    validating: boolean,
    touched(name: StringKeyOf<Data>): boolean,
    data(): Data,
    errors: Record<StringKeyOf<Data>, string>,
    hasErrors: boolean,
    valid(name: StringKeyOf<Data>): boolean,
    invalid(name: StringKeyOf<Data>): boolean,
    validate(name: StringKeyOf<Data>): Form<Data>,
    setErrors(errors: SimpleValidationErrors|ValidationErrors): Form<Data>,
    clearErrors(): Form<Data>,
    setValidationTimeout(duration: number): Form<Data>,
    submit(config: Config): Promise<unknown>,
    reset(...keys: (StringKeyOf<Data>)[]): Form<Data>,
}
