import { Alpine as TAlpine } from 'alpinejs'
import { client, Config, createValidator, RequestMethod, resolveName, toSimpleValidationErrors, ValidationConfig, resolveUrl, resolveMethod } from 'laravel-precognition'
import { cloneDeep, get, set } from 'lodash-es'
import { Form } from './types.js'

export { client }

export default function (Alpine: TAlpine) {
    Alpine.magic('form', (el) => <Data extends Record<string, unknown>>(method: RequestMethod|(() => RequestMethod), url: string|(() => string), inputs: Data, config: ValidationConfig = {}): Data&Form<Data> => {
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
        const validator = createValidator(client => client[resolveMethod(method)](resolveUrl(url), form.data(), config), originalData)
            .on('validatingChanged', () => {
                form.validating = validator.validating()
            })
            .on('validatedChanged', () => {
                state.valid = validator.valid()
            })
            .on('touchedChanged', () => {
                state.touched = validator.touched()
            })
            .on('errorsChanged', () => {
                form.hasErrors = validator.hasErrors()

                form.errors = toSimpleValidationErrors(validator.errors())

                state.valid = validator.valid()
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
            touch(name) {
                validator.touch(name)

                return form
            },
            validate(name, config) {
                if (typeof name === 'object' && ! ('target' in name)) {
                    config = name
                    name = undefined
                }

                if (typeof name === 'undefined') {
                    validator.validate(config)
                } else {
                    name = resolveName(name)

                    validator.validate(name, get(form.data(), name), config)
                }

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
                return client[resolveMethod(method)](resolveUrl(url), form.data(), resolveSubmitConfig(config))
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

        syncWithDom(el, resolveMethod(method), resolveUrl(url), form)

        return form
    })
}

/**
 * Sync the DOM form with the Precognitive form.
 */
const syncWithDom = <Data extends Record<string, unknown>>(el: Node, method: RequestMethod, url: string, form: Form<Data>): void => {
    if (! (el instanceof Element && el.nodeName === 'FORM')) {
        return
    }

    syncSyntheticMethodInput(el, method)
    syncMethodAttribute(el, method)
    syncActionAttribute(el, url)
    addProcessingListener(el, form)
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

    const input = el.insertAdjacentElement('afterbegin', document.createElement('input'))

    if (input === null) {
        return
    }

    input.setAttribute('type', 'hidden')
    input.setAttribute('name', '_method')
    input.setAttribute('value', method.toUpperCase())
}

/**
 * Add processing listener.
 */
const addProcessingListener = <Data extends Record<string, unknown>>(el: Element, form: Form<Data>) => el.addEventListener('submit', () => (form.processing = true))
