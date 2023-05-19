import {isAxiosError } from 'axios'
import { createValidator, Config, RequestMethod, SimpleValidationErrors, Validator, toSimpleValidationErrors } from 'laravel-precognition'
import cloneDeep from 'lodash.clonedeep'
import { useRef, useState } from 'react'

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod, url: string, input: Data, config: Config = {}) => {
    method = method.toLowerCase() as RequestMethod

    /**
     * The original data.
     */
    const originalData = useRef<Record<string, unknown>|null>(null)

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
    const [errors, setErrors] = useState<SimpleValidationErrors>({})

    /**
     * The reactive hasErrors state.
     */
    const [hasErrors, setHasErrors] = useState(false)

    /**
     * The reactive data state.
     */
    const [data, setData] = useState(() => cloneDeep(originalData))


    /**
     * The validator instance.
     */
    const validator = useRef<Validator|null>(null)

    if (validator.current === null) {
        validator.current = createValidator(client => method === 'get' || method === 'delete'
            ? client[method](url, config)
            : client[method](url, data, config))

        validator.current.on('validatingChanged', () => setValidating(validator.current!.validating()))

        validator.current.on('touchedChanged', () => {
            setTouched(validator.current!.touched())

            setValid(validator.current!.valid())
        })

        validator.current.on('errorsChanged', () => {
            setHasErrors(validator.current!.hasErrors())

            setValid(validator.current!.valid())

            setErrors(toSimpleValidationErrors(validator.current!.errors()))
        })
    }

    return {
        data,
        setData: (key: keyof Data, value: unknown) => setData(payload.current = {
            ...data,
            [key]: value,
        }),
        processing,
        errors,
        hasErrors,
        setErrors(errors)

        validate(input: string) {
            validator.current!.validate(input)
        },
        setValidatorTimeout: validator.current.setTimeout,
        submit: async (config?: any): Promise<unknown> => precognition.axios()[method](url, data, config)
            .catch((error: any) => {
                if (isAxiosError(error) && error.response?.status === 422) {
                    validator.current?.setErrors(error.response.data.errors)
                }

                return Promise.reject(error)
            })
    };
}
