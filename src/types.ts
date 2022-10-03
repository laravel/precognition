import { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios"

export type StatusHandler = (response: AxiosResponse, axiosError?: AxiosError) => unknown

export type ValidationErrors = { [key: string]: Array<string> }

export type SimpleValidationErrors = { [key: string]: string }

export type Config = AxiosRequestConfig&{
    onBefore?: () => void,
    onAfter?: () => void,
    validate?: Iterable<string>|ArrayLike<string>,
    onPrecognitionSuccess?: StatusHandler,
    onValidationError?: StatusHandler,
    onUnauthorized?: StatusHandler,
    onForbidden?: StatusHandler,
    onNotFound?: StatusHandler,
    onConflict?: StatusHandler,
    onLocked?: StatusHandler,
    fingerprint?: string|null,
}

export type RequestFingerprintResolver = (config: Config, axios: AxiosInstance) => string|null

export interface Client {
    get(url: string, config?: Config): Promise<unknown>,
    post(url: string, data?: unknown, config?: Config): Promise<unknown>,
    patch(url: string, data?: unknown, config?: Config): Promise<unknown>,
    put(url: string, data?: unknown, config?: Config): Promise<unknown>,
    delete(url: string, config?: Config): Promise<unknown>,
    validate(callback: ClientCallback): Validator,
    axios(): AxiosInstance,
    use(axios: AxiosInstance): Client,
    fingerprintRequestsUsing(callback: RequestFingerprintResolver|null): Client,
}

export interface Validator {
    validate(input: string|NamedInputEvent): Validator,
    touched(): Array<string>,
    onTouchedChanged(callback: () => void): Validator,
    passed(): Array<string>,
    errors(): ValidationErrors,
    onErrorsChanged(callback: () => void): Validator,
    setErrors(errors: ValidationErrors|SimpleValidationErrors): Validator,
    clearErrors(): Validator,
    validating(): string|null,
    onValidatingChanged(callback: () => void): Validator,
    processingValidation(): boolean,
    onProcessingValidationChanged(callback: () => void): Validator,
    setTimeout(duration: Timeout): Validator,
}

export interface Timeout {
    milliseconds?: number,
    seconds?: number,
    minutes?: number,
    hours?: number,
}

export type RequestMethods = 'get'|'post'|'patch'|'put'|'delete'

export type ClientCallback = (client: Pick<Client, RequestMethods>) => Promise<unknown>

interface NamedInputEventTarget extends EventTarget {
    name: string
}

export interface NamedInputEvent extends Event {
    readonly target: NamedInputEventTarget;
}
