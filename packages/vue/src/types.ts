import { Config, NamedInputEvent } from 'laravel-precognition'

export interface Form<Data extends Record<string, unknown>> {
    processing: boolean,
    validating: boolean,
    touched(name: keyof Data): boolean,
    data(): Data,
    errors: Record<keyof Data, string>,
    hasErrors: boolean,
    valid(name: keyof Data): boolean,
    invalid(name: keyof Data): boolean,
    validate(name: keyof Data|NamedInputEvent): Form<Data>,
    setErrors(errors: Record<Partial<keyof Data>, string|string[]>): Form<Data>
    setValidationTimeout(duration: number): Form<Data>,
    submit(config?: Config): Promise<unknown>,
    reset(...keys: (keyof Data)[]): Form<Data>,
}
