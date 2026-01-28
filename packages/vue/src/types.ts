import { ValidationConfig, Config, NamedInputEvent, Validator } from 'laravel-precognition'

type FormDataValue = string | number | boolean | null | undefined | Date | Blob | File | FileList

export type PrecognitionPath<Data> = 0 extends 1 & Data ? never : Data extends object ? {
    [K in Extract<keyof Data, string>]: 0 extends 1 & Data[K] ? never
        : Data[K] extends Array<infer U>
            ? K | `${K}.*` | (U extends FormDataValue ? never : `${K}.*.${Extract<keyof U, string>}` | `${K}.*.*`)
            : Data[K] extends FormDataValue ? K : K | `${K}.*` | `${K}.${PrecognitionPath<Data[K]>}`
}[Extract<keyof Data, string>] : never

export interface Form<Data extends Record<string, unknown>> {
    processing: boolean,
    validating: boolean,
    touched(name?: keyof Data): boolean,
    touch(name: string | NamedInputEvent | Array<string>): Data & Form<Data>,
    data(): Data,
    setData(data: Record<string, unknown>): Data & Form<Data>,
    errors: Partial<Record<keyof Data, string>>,
    hasErrors: boolean,
    valid(name: keyof Data): boolean,
    invalid(name: keyof Data): boolean,
    validate(name?: PrecognitionPath<Data> | NamedInputEvent | ValidationConfig, config?: ValidationConfig): Data & Form<Data>,
    setErrors(errors: Partial<Record<keyof Data, string | string[]>>): Data & Form<Data>
    forgetError(string: keyof Data | NamedInputEvent): Data & Form<Data>
    setValidationTimeout(duration: number): Data & Form<Data>,
    submit(config?: Config): Promise<unknown>,
    reset(...keys: (keyof Partial<Data>)[]): Data & Form<Data>,
    validateFiles(): Data & Form<Data>,
    withoutFileValidation(): Data & Form<Data>,
    validator(): Validator,
}
