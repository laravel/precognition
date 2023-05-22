import { resolveName, client, createValidator, Config, RequestMethod, Validator, toSimpleValidationErrors } from 'laravel-precognition'
import cloneDeep from 'lodash.clonedeep'
// @ts-expect-error
import get from 'lodash.get'
import set from 'lodash.set'
import { useRef, useState } from 'react'
import { Form } from './types'

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod, url: string, input: Data, config: Config = {}): Form<Data> => {
    // @ts-expect-error
    method = method.toLowerCase()

    /**
     * The original data.
     */
    const originalData = useRef<Data|null>(null)

    if (originalData.current === null) {
        originalData.current = cloneDeep(input)
    }

    /**
     * The original input names.
     */
    const originalInputs = useRef<(keyof Data)[]|null>(null)

    if (originalInputs.current === null) {
        originalInputs.current = Object.keys(originalData)
    }

    /**
     * The current payload.
     */
    const payload = useRef(originalData.current)

    /**
     * The reactive valid state.
     */
    const [valid, setValid] = useState<(keyof Partial<Data>)[]>([])

    /**
     * The reactive touched state.
     */
    const [touched, setTouched] = useState<(keyof Partial<Data>)[]>([])

    /**
     * The reactive validating state.
     */
    const [validating, setValidating] = useState(false)

    /**
     * The reactive validating state.
     */
    const [processing, setProcessing] = useState(false)

    /**
     * The reactive errors state.
     */
    const [errors, setErrors] = useState<Partial<Record<keyof Data, string>>>({})

    /**
     * The reactive hasErrors state.
     */
    const [hasErrors, setHasErrors] = useState(false)

    /**
     * The reactive data state.
     */
    const [data, setData] = useState(() => cloneDeep(originalData.current!))

    /**
     * The validator instance.
     */
    const validator = useRef<Validator|null>(null)

    if (validator.current === null) {
        validator.current = createValidator(client => client[method](url, payload.current, config), input)
            .on('validatingChanged', () => {
                setValidating(validator.current!.validating())
            })
            .on('touchedChanged', () => {
                setTouched(validator.current!.touched())

                setValid(validator.current!.valid())
            })
            .on('errorsChanged', () => {
                setHasErrors(validator.current!.hasErrors())

                setValid(validator.current!.valid())

                // @ts-expect-error
                setErrors(toSimpleValidationErrors(validator.current!.errors()))
            })
    }

    /**
     * Resolve the config for a form submission.
     */
    const resolveSubmitConfig = (config: Config): Config => ({
        ...config,
        precognitive: false,
        onStart: () => {
            setProcessing(true);

            (config.onStart ?? (() => null))()
        },
        onFinish: () => {
            setProcessing(false);

            (config.onFinish ?? (() => null))()
        },
        onValidationError: (response, error) => {
            validator.current!.setErrors(response.data.errors)

            return config.onValidationError
                ? config.onValidationError(response)
                : Promise.reject(error)
        },
    })

    /**
     * The form instance.
     */
    return {
        data,
        setData(key, value) {
            const newData = cloneDeep(payload.current!)

            payload.current = set(newData, key, value)

            setData(payload.current)

            return this
        },
        touched(name) {
            return touched.includes(name)
        },
        validate(name) {
            // @ts-expect-error
            name = resolveName(name)

            validator.current!.validate(name, get(payload.current, name))

            return this
        },
        validating,
        valid(name) {
            return valid.includes(name)
        },
        invalid(name) {
            return typeof errors[name] !== 'undefined'
        },
        errors,
        hasErrors,
        setErrors(errors) {
            // @ts-expect-error
            validator.current!.setErrors(errors)

            return this
        },
        reset(...names) {
            const original = cloneDeep(originalData.current)!

            if (names.length === 0) {
                payload.current = original

                setData(original)
            } else {
                names.forEach(name => (set(payload.current, name, get(original, name))))

                setData(payload.current)
            }

            validator.current!.reset()

            return this
        },
        setValidationTimeout(duration) {
            validator.current!.setTimeout(duration)

            return this
        },
        processing,
        async submit(config = {}) {
            return client[method](url, payload.current, resolveSubmitConfig(config))
        },
    }
}
