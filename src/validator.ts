import { Client, ClientCallback, Config, Validator as TValidator } from './types'

const withChanged = (config: Config, changed: Set<string>): Config => {
    if (typeof config.validate === 'undefined') {
        config.validate = changed
    }

    return config
}

export const Validator = (client: Client, callback: ClientCallback): TValidator => {
    let validating = false
    // const timeout = 1333 // default: 1 + 1/3 of a second
    const changed: Set<string> = new Set

    return {
        debounce() {
            // TODO
            return this
        },
        changed: () => changed,
        validating: () => validating,
        validate(input) {
            changed.add(input)
            validating = true

            callback(new Proxy(client, {
                get(target, prop) {
                    if (typeof prop !== 'string') {
                        return
                    }

                    if (prop === 'get' || prop === 'delete') {
                        return (url: string, config: Config = {}) => target[prop](url, withChanged(config, changed))
                    }

                    if (prop ==='post' || prop === 'patch' || prop === 'put') {
                        return (url: string, data: unknown = {}, config: Config = {}) => target.post(url, data, withChanged(config, changed))
                    }
                },
            })).finally(() => validating = false)

            return this
        },
    }
}
