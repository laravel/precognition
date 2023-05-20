import { client, createValidator, Config, RequestMethod, Validator, toSimpleValidationErrors } from 'laravel-precognition'
import cloneDeep from 'lodash.clonedeep'
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
     * The previous payload.
     */
    const previousPayload = useRef(originalData.current)

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
        validator.current = createValidator(client => client[method](url, payload.current, config))

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
                ...payload.current!,
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
            // Due to the way that react works, we do this so that "onBlur" may
            // mimick the "onChange" functionality found in the Vue plugin. If
            // this becomes problematic we could consider adding a "force" flag
            // or function.
            if (previousPayload.current == payload.current) {
                return this
            }

            previousPayload.current = payload.current

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
            names = (names.length === 0 ? originalInputs.current! : names)

            const original = cloneDeep(originalData.current!)

            // @ts-expect-error
            setData(names.reduce((newData, name) => ({
                ...newData,
                [name]: original[name],
            }), names)
)
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
