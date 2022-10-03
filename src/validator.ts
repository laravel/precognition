import debounce from 'lodash.debounce'
import { Client, ClientCallback, Config, NamedInputEvent, Timeout, ValidationErrors, Validator as TValidator } from './types'

export const Validator = (client: Client, callback: ClientCallback): TValidator => {
    const withConfig = (config: Config|undefined): Config => {
        config = config ?? {}

        if (typeof config.validate === 'undefined') {
            config.validate = touched
        }

        const userValidationHandler = config.onValidationError

        config.onValidationError = (e, axiosError) => {
            errors = e

            if (userValidationHandler) {
                return userValidationHandler(e, axiosError)
            }
        }

        return config
    }

    const createValidator = () => debounce(function () {
        processingValidation = true

        callback({
            get: (url, config = {}) => client.get(url, withConfig(config)),
            post: (url, data = {}, config) => client.post(url, data, withConfig(config)),
            patch: (url, data = {}, config) => client.patch(url, data, withConfig(config)),
            put: (url, data = {}, config) => client.put(url, data, withConfig(config)),
            delete: (url, config = {}) => client.delete(url, withConfig(config)),
        }).finally(() => {
            validating = null
            processingValidation = false
        })

        return validator
    }, timeoutDuration, { leading: true, trailing: true })

    let validating: string|null = null
    let processingValidation = false
    let timeoutDuration = 1333 // default: 1 + 1/3 of a second
    const touched: Set<string> = new Set
    let validate = createValidator()
    let errors: ValidationErrors = {}

    const validator: TValidator = {
        validate(input: string|NamedInputEvent) {
            input = typeof input !== 'string' ? input.target.name : input

            touched.add(input)
            validating = input
            validate()

            return this
        },
        errors: () => errors,
        touched: () => touched,
        validating: () => validating,
        processingValidation: () => processingValidation,
        withTimeout(t: Timeout) {
            timeoutDuration = (t.milliseconds ?? 0)
                + ((t.seconds ?? 0) * 1000)
                + ((t.minutes ?? 0) * 60000)
                + ((t.hours ?? 0) * 3600000)

            validate.cancel()
            validate = createValidator()

            return this
        },
    }

    return validator
}
