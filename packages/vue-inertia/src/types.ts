import { Config, NamedInputEvent, RequestMethod, SimpleValidationErrors, ValidationConfig, ValidationErrors } from 'laravel-precognition'
import { Form as PrecognitiveForm } from 'laravel-precognition-vue/dist/types'
import { InertiaForm } from '@inertiajs/vue3'

export type Form<Data extends Record<string, unknown>> = Omit<PrecognitiveForm<Data>, 'setErrors'|'touch'|'forgetError'|'setValidationTimeout'|'submit'|'reset'|'validateFiles'|'setData'|'validate'> & InertiaForm<Data> & {
    setErrors(errors: SimpleValidationErrors|ValidationErrors): Form<Data>,
    touch(name: Array<string>|string|NamedInputEvent): Form<Data>,
    forgetError(string: keyof Data|NamedInputEvent): Data&Form<Data>,
    setValidationTimeout(duration: number): Data&Form<Data>,
    submit(submitMethod: RequestMethod|Config, submitUrl?: string, submitOptions?: any): void,
    reset(...keys: (keyof Partial<Data>)[]): Data&Form<Data>,
    validateFiles(): Data&Form<Data>,
    setData(data: Record<string, unknown>): Data&Form<Data>,
    validate(name?: (keyof Data|NamedInputEvent)|ValidationConfig, config?: ValidationConfig): Data&Form<Data>,
}
