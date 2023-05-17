import { SimpleValidationErrors, ValidationErrors } from 'laravel-precognition'
import { Ref } from 'vue'

export interface Form<Data> {
    data(): Data,
    submit(): Promise<unknown>,
    validating: Ref<boolean>,
    errors: Ref<Record<keyof Data, string>>,
    hasErrors: Ref<boolean>,
    valid(name: string): boolean,
    invalid(name: string): boolean,
    validate(name: string): Form<Data>,
    setErrors(errors: SimpleValidationErrors|ValidationErrors): Form<Data>,
    clearErrors(): Form<Data>,
    setValidationTimeout(duration: number): Form<Data>,
    reset(...keys: string[]): Form<Data>,
}
