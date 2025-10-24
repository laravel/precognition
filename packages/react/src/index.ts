import { resolveName, client, createValidator, Config, RequestMethod, Validator, toSimpleValidationErrors, ValidationConfig, resolveUrl, resolveMethod } from 'laravel-precognition'
import { cloneDeep, get, set } from 'lodash-es'
import { ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { Field, Form } from './types.js'

export { client, Field, Form }

export const useForm = <Data extends Record<string, unknown>>(method: RequestMethod | (() => RequestMethod), url: string | (() => string), input: Data, config: ValidationConfig = {}): Form<Data> => {
    /**
     * The original data.
     */
    const originalData = useRef<Data | null>(null)

    if (originalData.current === null) {
        originalData.current = cloneDeep(input)
    }

    /**
     * The original input names.
     */
    const originalInputs = useRef<(keyof Data)[] | null>(null)

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
    const validator = useRef<Validator | null>(null)

    if (validator.current === null) {
        validator.current = createValidator((client) => client[resolveMethod(method)](resolveUrl(url), payload.current, config), input)
            .on('validatingChanged', () => {
                setValidating(validator.current!.validating())
            })
            .on('validatedChanged', () => {
                setValid(validator.current!.valid())
            })
            .on('touchedChanged', () => {
                setTouched(validator.current!.touched())
            })
            .on('errorsChanged', () => {
                setHasErrors(validator.current!.hasErrors())

                // @ts-expect-error
                setErrors(toSimpleValidationErrors(validator.current!.errors()))

                setValid(validator.current!.valid())
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
    const form: Form<Data> = {
        data,
        setData(key, value) {
            if (typeof key === 'object') {
                payload.current = key

                setData(key)
            } else {
                const newData = cloneDeep(payload.current!)

                payload.current = set(newData, key, value)

                setData(payload.current)
            }

            return form
        },
        touched(name) {
            if (typeof name === 'string') {
                return touched.includes(name)
            } else {
                return touched.length > 0
            }
        },
        touch(name) {
            validator.current!.touch(name)

            return form
        },
        validate(name, config) {
            if (typeof name === 'object' && !('target' in name)) {
                config = name
                name = undefined
            }

            if (typeof name === 'undefined') {
                validator.current!.validate(config)
            } else {
                // @ts-expect-error
                name = resolveName(name)

                validator.current!.validate(name, get(payload.current, name), config)
            }

            return form
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

            return form
        },
        forgetError(name) {
            // @ts-expect-error
            validator.current!.forgetError(name)

            return form
        },
        reset(...names) {
            const original = cloneDeep(originalData.current)!

            if (names.length === 0) {
                payload.current = original

                setData(original)
            } else {
                names.forEach((name) => (set(payload.current, name, get(original, name))))

                setData(payload.current)
            }

            // @ts-expect-error
            validator.current!.reset(...names)

            return form
        },
        setValidationTimeout(duration) {
            validator.current!.setTimeout(duration)

            return form
        },
        processing,
        async submit(config = {}) {
            return client[resolveMethod(method)](resolveUrl(url), payload.current, resolveSubmitConfig(config))
        },
        validateFiles() {
            validator.current!.validateFiles()

            return form
        },
        validator() {
            return validator.current!
        },
    }

    return form
}


export function Controller<
    TData extends Record<string, unknown> = Record<string, unknown>,
    TName extends Extract<keyof TData, string> = Extract<keyof TData, string>
>({
    form,
    name,
    children
}: {
    form: Form<TData>;
    name: TName;
    children:
        | ((field: Field<TData, TName>) => ReactNode)
        | ReactNode;
}): ReactNode {
    const state = useMemo(
        () => ({
            value: form.data[name],
            touched: form.touched(name),
            error: form.errors[name],
            valid: form.valid(name),
            invalid: form.invalid(name)
        }),
        [form, name]
    );

    const setValue = useCallback(
        (value: TData[TName]) => {
            form.setData(name, value);
        },
        [form, name]
    );

    const validate = useCallback(() => {
        form.validate(name);
    }, [form, name]);

    const touch = useCallback(() => {
        form.touch(name);
    }, [form, name]);

    const setError = useCallback(
        (error: string | string[]) => {
            form.setErrors({ [name]: error } as Partial<
                Record<keyof TData, string | string[]>
            >);
        },
        [form, name]
    );
    const clearError = useCallback(() => {
        form.forgetError(name);
    }, [form, name]);

    const reset = useCallback(() => {
        form.reset(name);
    }, [form, name]);
    const resetAndClearError = useCallback(() => {
        form.reset(name);
        form.forgetError(name);
    }, [form, name]);

    return typeof children === 'function'
        ? children({
              name,
              state,
              setValue,
              validate,
              touch,
              setError,
              clearError,
              reset,
              resetAndClearError
          })
        : children;
}
