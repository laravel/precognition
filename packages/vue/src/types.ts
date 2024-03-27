import { Config, NamedInputEvent, Validator } from 'laravel-precognition'

export interface Form<Data extends Record<string, unknown>> {
    processing: boolean,
    validating: boolean,
    touched(name: keyof Data): boolean,
    touch(name: string|NamedInputEvent|Array<string>): Data&Form<Data>,
    data(): Data,
    setData(data: Record<string, unknown>): Data&Form<Data>,
    errors: Partial<Record<keyof Data, string>>,
    hasErrors: boolean,
    valid(name: keyof Data): boolean,
    invalid(name: keyof Data): boolean,
    validate(name?: (keyof Data|NamedInputEvent)|Config, config?: Config): Promise<unknown>,
    setErrors(errors: Partial<Record<keyof Data, string|string[]>>): Data&Form<Data>
    forgetError(string: keyof Data|NamedInputEvent): Data&Form<Data>
    setValidationTimeout(duration: number): Data&Form<Data>,
    submit(config?: Config): Promise<unknown>,
    reset(...keys: (keyof Partial<Data>)[]): Data&Form<Data>,
    validateFiles(): Form<Data>,
    validator(): Validator,
}
