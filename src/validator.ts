import debounce from 'lodash.debounce'
import { Client, ClientCallback, Config, NamedInputEvent, Timeout, Validator as TValidator } from './types'

export const Validator = (client: Client, callback: ClientCallback): TValidator => {
    const withConfig = (config: Config|undefined): Config => {
        config = config ?? {}

        if (typeof config.validate === 'undefined') {
            config.validate = touched
        }

        return config
    }

    const createValidator = () => debounce(function (input) {
        touched.add(input)
        validating = true

        callback({
            get: (url, config = {}) => client.get(url, withConfig(config)),
            post: (url, data = {}, config) => client.post(url, data, withConfig(config)),
            patch: (url, data = {}, config) => client.patch(url, data, withConfig(config)),
            put: (url, data = {}, config) => client.put(url, data, withConfig(config)),
            delete: (url, config = {}) => client.delete(url, withConfig(config)),
        }).finally(() => validating = false)

        return validator
    }, timeoutDuration, { leading: true, trailing: true })

    let validating = false
    let timeoutDuration = 1333 // default: 1 + 1/3 of a second
    const touched: Set<string> = new Set
    let validate = createValidator()

    const validator: TValidator = {
        validate(input: string|NamedInputEvent) {
            validate(typeof input !== 'string' ? input.target.name : input)

            return this
        },
        touched: () => touched,
        validating: () => validating,
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
