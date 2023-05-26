import { Alpine as TAlpine } from 'alpinejs'
import { client, Config, createValidator, RequestMethod, resolveName, toSimpleValidationErrors, ValidationConfig } from 'laravel-precognition'
import cloneDeep from 'lodash.clonedeep'
import get from 'lodash.get'
import set from 'lodash.set'
import { Form } from './types'

export default function (Alpine: TAlpine) {
    Alpine.magic('form', (el) => <Data extends Record<string, unknown>>(method: RequestMethod, url: string, inputs: Data, config: ValidationConfig = {}): Data&Form<Data> => {
        // @ts-expect-error
        method = method.toLowerCase()

        syncWithDom(el, method, url)

        /**
         * The original data.
         */
        const originalData = cloneDeep(inputs)

        /**
         * The original input names.
         */
        const originalInputs = Object.keys(originalData)

        /**
         * Internal reactive state.
         */
        const state: {
            touched: string[],
            valid: string[],
        } = Alpine.reactive({
            touched: [],
            valid: [],
        })

        /**
         * The validator instance.
         */
        const validator = createValidator(client => client[method](url, form.data(), config), originalData)
            .on('validatingChanged', () => {
                form.validating = validator.validating()
            })
            .on('touchedChanged', () => {
                state.valid = validator.valid()

                state.touched = validator.touched()
            })
            .on('errorsChanged', () => {
                state.valid = validator.valid()

                form.hasErrors = validator.hasErrors()

                form.errors = toSimpleValidationErrors(validator.errors())
            })

        /**
         * Resolve the config for a form submission.
         */
        const resolveSubmitConfig = (config: Config): Config => ({
            ...config,
            precognitive: false,
            onStart: () => {
                form.processing = true;

                (config.onStart ?? (() => null))()
            },
            onFinish: () => {
                form.processing = false;

                (config.onFinish ?? (() => null))()
            },
            onValidationError: (response, error) => {
                validator.setErrors(response.data.errors)

                return config.onValidationError
                    ? config.onValidationError(response)
                    : Promise.reject(error)
            },
        })

        /**
         * Create a new form instance.
         */
        const createForm = (): Data&Form<Data> => ({
            ...cloneDeep(inputs),
            data() {
                const newForm = cloneDeep(form)

                return originalInputs.reduce((carry, name) => ({
                    ...carry,
                    [name]: newForm[name],
                }), {}) as Data
            },
            touched(name) {
                return state.touched.includes(name)
            },
            validate(name) {
                name = resolveName(name)

                validator.validate(name, get(form.data(), name))

                return form
            },
            validating: false,
            valid(name) {
                return state.valid.includes(name)
            },
            invalid(name) {
                return typeof form.errors[name] !== 'undefined'
            },
            errors: {},
            hasErrors: false,
            setErrors(errors) {
                validator.setErrors(errors)

                return form
            },
            forgetError(name) {
                validator.forgetError(name)

                return form
            },
            reset(...names) {
                const original = cloneDeep(originalData)

                if (names.length === 0) {
                    // @ts-expect-error
                    originalInputs.forEach(name => (form[name] = original[name]))
                } else {
                    names.forEach(name => set(form, name, get(original, name)))
                }

                validator.reset(...names)

                return form
            },
            setValidationTimeout(duration) {
                validator.setTimeout(duration)

                return form
            },
            processing: false,
            async submit(config = {}) {
                return client[method](url, form.data(), resolveSubmitConfig(config))
            },
            validateFiles() {
                validator.validateFiles()

                return form
            },
        })

        /**
         * The form instance.
         */
        const form = Alpine.reactive(createForm()) as Data&Form<Data>

        return form
    })
}

/**
 * Sync the DOM form with the Precognitive form.
 */
const syncWithDom = (el: Node, method: RequestMethod, url: string): void => {
    if (! (el instanceof Element && el.nodeName === 'FORM')) {
        return
    }

    syncSyntheticMethodInput(el, method)
    syncMethodAttribute(el, method)
    syncActionAttribute(el, url)
}

/**
 * Sync the form's "method" attribute.
 */
const syncMethodAttribute = (el: Element, method: RequestMethod) => {
    if (method !== 'get' && ! el.hasAttribute('method')) {
        el.setAttribute('method', 'POST')
    }
}

/**
 * Sync the form's "action" attribute.
 */
const syncActionAttribute = (el: Element, url: string) => {
    if (! el.hasAttribute('action')) {
        el.setAttribute('action', url)
    }
}

/**
 * Sync the form's sythentic "method" input.
 */
const syncSyntheticMethodInput = (el: Element, method: RequestMethod) => {
    if (['get', 'post'].includes(method)) {
        return
    }

    const existing = el.querySelector('input[type="hidden"][name="_method"]')

    if (existing !== null) {
        return
    }

    console.log('here')

    const input = el.insertAdjacentElement('afterbegin', document.createElement('input'))

    if (input === null) {
        return
    }

    input.setAttribute('type', 'hidden')
    input.setAttribute('name', '_method')
    input.setAttribute('value', method.toUpperCase())
}
