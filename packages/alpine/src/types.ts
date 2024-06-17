import { Config, NamedInputEvent, SimpleValidationErrors, ValidationConfig, ValidationErrors } from 'laravel-precognition'

export interface Form<Data extends Record<string, unknown>> {
    processing: boolean,
    validating: boolean,
    touched(name: string): boolean,
    touch(name: string|NamedInputEvent|Array<string>): Data&Form<Data>,
    data(): Data,
    errors: Record<string, string>,
    hasErrors: boolean,
    valid(name: string): boolean,
    invalid(name: string): boolean,
    validate(name?: string|NamedInputEvent|ValidationConfig, config?: ValidationConfig): Data&Form<Data>,
    setErrors(errors: SimpleValidationErrors|ValidationErrors): Data&Form<Data>
    forgetError(name: string|NamedInputEvent): Data&Form<Data>
    setValidationTimeout(duration: number): Data&Form<Data>,
    submit(config?: Config): Promise<unknown>,
    reset(...keys: string[]): Data&Form<Data>,
    validateFiles(): Data&Form<Data>,
}
