import { Config, NamedInputEvent, ValidationConfig, Validator } from 'laravel-precognition'

export interface Form<Data extends Record<string, unknown>> {
    processing: boolean,
    validating: boolean,
    touched(name?: keyof Data): boolean,
    touch(name: string | NamedInputEvent | Array<string>): Form<Data>,
    data: Data,
    setData(key: Data | keyof Data, value?: unknown): Form<Data>,
    errors: Partial<Record<keyof Data, string>>,
    hasErrors: boolean,
    valid(name: keyof Data): boolean,
    invalid(name: keyof Data): boolean,
    validate(name?: keyof Data | NamedInputEvent | ValidationConfig, config?: ValidationConfig): Form<Data>,
    setErrors(errors: Partial<Record<keyof Data, string | string[]>>): Form<Data>
    forgetError(string: keyof Data | NamedInputEvent): Form<Data>
    setValidationTimeout(duration: number): Form<Data>,
    submit(config?: Config): Promise<unknown>,
    reset(...names: (keyof Partial<Data>)[]): Form<Data>,
    validateFiles(): Form<Data>,
    validator(): Validator,
}

export interface Field<
    TData extends Record<string, unknown> = Record<string, unknown>,
    TName extends Extract<keyof TData, string> = Extract<keyof TData, string>
> {
    name: TName;
    state: {
        value: TData[TName];
        touched: boolean;
        error: string | undefined;
        valid: boolean;
        invalid: boolean;
    };
    setValue: (value: TData[TName]) => void;
    validate: () => void;
    touch: () => void;
    setError: (error: string) => void;
    clearError: () => void;
    reset: () => void;
    resetAndClearError: () => void;
}
