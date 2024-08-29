import { NamedInputEvent, RequestMethod, SimpleValidationErrors, ValidationConfig, ValidationErrors } from 'laravel-precognition'
import { Form as PrecognitiveForm } from 'laravel-precognition-vue/dist/types'
import { InertiaForm } from '@inertiajs/vue3'
import { VisitOptions } from '@inertiajs/core'

type RedefinedProperties = 'setErrors'|'touch'|'forgetError'|'setValidationTimeout'|'submit'|'reset'|'validateFiles'|'setData'|'validate'

export type Form<Data extends Record<string, unknown>> = Omit<PrecognitiveForm<Data>, RedefinedProperties> & InertiaForm<Data> & {
    setErrors(errors: SimpleValidationErrors|ValidationErrors): Data&Form<Data>,
    touch(name: Array<string>|string|NamedInputEvent): Data&Form<Data>,
    forgetError(string: keyof Data|NamedInputEvent): Data&Form<Data>,
    setValidationTimeout(duration: number): Data&Form<Data>,
    submit(config?: Partial<VisitOptions>): void,
    submit(method: RequestMethod, url: string, options?: Partial<VisitOptions>): void,
    reset(...keys: (keyof Partial<Data>)[]): Data&Form<Data>,
    validateFiles(): Data&Form<Data>,
    setData(data: Record<string, unknown>): Data&Form<Data>,
    validate(name?: (keyof Data|NamedInputEvent)|ValidationConfig, config?: ValidationConfig): Data&Form<Data>,
}
