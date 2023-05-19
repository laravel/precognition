import { client, createValidator, Config, RequestMethod, Validator, toSimpleValidationErrors } from 'laravel-precognition'
import cloneDeep from 'lodash.clonedeep'
import { useRef, useState } from 'react'
import { Form } from './types'

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod, url: string, input: Data, config: Config = {}): Form<Data> => {
    method = method.toLowerCase() as RequestMethod

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
        originalInputs.current = Object.keys(originalData) as (keyof Data)[]
    }

    /**
     * The current payload.
     */
    const payload = useRef(originalData.current)

    /**
     * The reactive valid state.
     */
    const [valid, setValid] = useState([] as (keyof Data)[])

    /**
     * The reactive touched state.
     */
    const [touched, setTouched] = useState([] as (keyof Data)[])

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
    const [errors, setErrors] = useState({} as Record<keyof Data, string>)

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
        validator.current = createValidator(client => method === 'get' || method === 'delete'
            ? client[method](url, config)
            : client[method](url, data, config))

        /**
         * Register event listeners...
         */
        validator.current.on('validatingChanged', () => setValidating(validator.current!.validating()))

        validator.current.on('touchedChanged', () => {
            setTouched(validator.current!.touched())

            setValid(validator.current!.valid())
        })

        validator.current.on('errorsChanged', () => {
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
            const newData = {
                ...data!,
                [key]: value,
            }

            payload.current = newData

            setData(newData)

            return this
        },
        touched(name) {
            return touched.includes(name)
        },
        validate(input) {
            // @ts-expect-error
            validator.current!.validate(input)

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
            const original = cloneDeep(originalData.current!)

            const newData = {} as Partial<Data>

            names = (names.length === 0 ? originalInputs.current! : names)

            names.forEach(name => (newData[name] = original[name]))

            setData(newData as Data)

            validator.current!.reset()

            return this
        },
        setValidationTimeout(duration) {
            validator.current!.setTimeout(duration)

            return this
        },
        processing,
        async submit(config = {}): Promise<unknown> {
            return (method === 'get' || method === 'delete'
                ? client[method](url, resolveSubmitConfig(config))
                : client[method](url, data, resolveSubmitConfig(config)))
        },
    }
}
