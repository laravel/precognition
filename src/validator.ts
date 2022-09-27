import debounce from 'lodash.debounce'
import { Client, ClientCallback, Config, NamedInputEvent, Timeout, Validator as TValidator } from './types'

export const Validator = (client: Client, callback: ClientCallback): TValidator => {
    const withChanged = (config: Config): Config => {
        if (typeof config.validate === 'undefined') {
            config.validate = changed
        }

        return config
    }

    const createValidator = () => debounce(function (input) {
        changed.add(input)
        validating = true

        callback({
            get: (url, config = {}) => client.get(url, withChanged(config)),
            post: (url, data = {}, config) => client.post(url, data, withChanged(config)),
            patch: (url, data = {}, config) => client.patch(url, data, withChanged(config)),
            put: (url, data = {}, config) => client.put(url, data, withChanged(config)),
            delete: (url, config = {}) => client.delete(url, withChanged(config)),
        }).finally(() => validating = false)

        return validator
    }, timeoutDuration, { leading: true, trailing: true })

    let validating = false
    let timeoutDuration = 1333 // default: 1 + 1/3 of a second
    const changed: Set<string> = new Set
    let validate = createValidator()

    const validator: TValidator = {
        validate(input: string|NamedInputEvent) {
            validate(typeof input !== 'string' ? input.target.name : input)

            return this
        },
        changed: () => changed,
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
