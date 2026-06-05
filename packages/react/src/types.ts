import { Config, NamedInputEvent, PrecognitionPath, ValidationConfig, Validator } from 'laravel-precognition'

export interface Form<Data extends Record<string, unknown>> {
    processing: boolean,
    validating: boolean,
    touched(name?: PrecognitionPath<Data>): boolean,
    touch(name: string | NamedInputEvent | Array<string>): Form<Data>,
    data: Data,
    setData(key: Data | keyof Data, value?: unknown): Form<Data>,
    errors: Partial<Record<PrecognitionPath<Data>, string>>,
    hasErrors: boolean,
    valid(name: PrecognitionPath<Data>): boolean,
    invalid(name: PrecognitionPath<Data>): boolean,
    validate(name?: PrecognitionPath<Data> | NamedInputEvent | ValidationConfig, config?: ValidationConfig): Form<Data>,
    setErrors(errors: Partial<Record<PrecognitionPath<Data>, string | string[]>>): Form<Data>
    forgetError(string: PrecognitionPath<Data> | NamedInputEvent): Form<Data>
    setValidationTimeout(duration: number): Form<Data>,
    submit(config?: Config): Promise<unknown>,
    reset(...names: (PrecognitionPath<Data>)[]): Form<Data>,
    validateFiles(): Form<Data>,
    withoutFileValidation(): Form<Data>,
    validator(): Validator,
}
