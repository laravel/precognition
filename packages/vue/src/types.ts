import { ValidationConfig, Config, NamedInputEvent, PrecognitionPath, Validator } from 'laravel-precognition'

export interface Form<Data extends Record<string, unknown>> {
    processing: boolean,
    validating: boolean,
    touched(name?: PrecognitionPath<Data>): boolean,
    touch(name: string | NamedInputEvent | Array<string>): Data & Form<Data>,
    data(): Data,
    setData(data: Record<string, unknown>): Data & Form<Data>,
    errors: Partial<Record<PrecognitionPath<Data>, string>>,
    hasErrors: boolean,
    valid(name: PrecognitionPath<Data>): boolean,
    invalid(name: PrecognitionPath<Data>): boolean,
    validate(name?: PrecognitionPath<Data> | NamedInputEvent | ValidationConfig, config?: ValidationConfig): Data & Form<Data>,
    setErrors(errors: Partial<Record<PrecognitionPath<Data>, string | string[]>>): Data & Form<Data>
    forgetError(string: PrecognitionPath<Data> | NamedInputEvent): Data & Form<Data>
    setValidationTimeout(duration: number): Data & Form<Data>,
    submit(config?: Config): Promise<unknown>,
    reset(...keys: (PrecognitionPath<Data>)[]): Data & Form<Data>,
    validateFiles(): Data & Form<Data>,
    withoutFileValidation(): Data & Form<Data>,
    validator(): Validator,
}
