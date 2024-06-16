import { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

export type StatusHandler = (response: AxiosResponse, axiosError?: AxiosError) => unknown

export type ValidationErrors = Record<string, Array<string>>

export type SimpleValidationErrors = Record<string, string>

export type Config = AxiosRequestConfig&{
    precognitive?: boolean,
    validate?: Iterable<string>|ArrayLike<string>,
    fingerprint?: string|null,
    onBefore?: () => boolean|undefined,
    onStart?: () => void,
    onSuccess?: (response: AxiosResponse) => unknown,
    onPrecognitionSuccess?: (response: AxiosResponse) => unknown,
    onValidationError?: StatusHandler,
    onUnauthorized?: StatusHandler,
    onForbidden?: StatusHandler,
    onNotFound?: StatusHandler,
    onConflict?: StatusHandler,
    onLocked?: StatusHandler,
    onFinish?: () => void,
}

interface RevalidatePayload {
    data: Record<string, unknown>|null,
    touched: Array<string>,
}

export type ValidationConfig = Config&{
    onBeforeValidation?: (newRequest: RevalidatePayload, oldRequest: RevalidatePayload) => boolean|undefined,
}

export type RequestFingerprintResolver = (config: Config, axios: AxiosInstance) => string|null

export type SuccessResolver = (response: AxiosResponse) => boolean

export interface Client {
    get(url: string, data?: Record<string, unknown>, config?: Config): Promise<unknown>,
    post(url: string, data?: Record<string, unknown>, config?: Config): Promise<unknown>,
    patch(url: string, data?: Record<string, unknown>, config?: Config): Promise<unknown>,
    put(url: string, data?: Record<string, unknown>, config?: Config): Promise<unknown>,
    delete(url: string, data?: Record<string, unknown>, config?: Config): Promise<unknown>,
    use(axios: AxiosInstance): Client,
    fingerprintRequestsUsing(callback: RequestFingerprintResolver|null): Client,
    determineSuccessUsing(callback: SuccessResolver): Client,
    axios(): AxiosInstance,
}

export interface Validator {
    touched(): Array<string>,
    validate(input?: string|NamedInputEvent|Config, value?: unknown, config?: Config): Validator,
    touch(input: string|NamedInputEvent|Array<string>): Validator,
    validating(): boolean,
    valid(): Array<string>,
    errors(): ValidationErrors,
    setErrors(errors: ValidationErrors|SimpleValidationErrors): Validator,
    hasErrors(): boolean,
    forgetError(error: string|NamedInputEvent): Validator,
    reset(...names: string[]): Validator,
    setTimeout(duration: number): Validator,
    on(event: keyof ValidatorListeners, callback: () => void): Validator,
    validateFiles(): Validator,
}

export interface ValidatorListeners {
    errorsChanged: Array<() => void>,
    validatingChanged: Array<() => void>,
    touchedChanged: Array<() => void>,
    validatedChanged: Array<() => void>,
}

export type RequestMethod = 'get'|'post'|'patch'|'put'|'delete'

export type ValidationCallback = (client: {
    get(url: string, data?: Record<string, unknown>, config?: ValidationConfig): Promise<unknown>,
    post(url: string, data?: Record<string, unknown>, config?: ValidationConfig): Promise<unknown>,
    patch(url: string, data?: Record<string, unknown>, config?: ValidationConfig): Promise<unknown>,
    put(url: string, data?: Record<string, unknown>, config?: ValidationConfig): Promise<unknown>,
    delete(url: string, data?: Record<string, unknown>, config?: ValidationConfig): Promise<unknown>,
}) => Promise<unknown>

interface NamedEventTarget extends EventTarget {
    name: string
}

export interface NamedInputEvent extends InputEvent {
    readonly target: NamedEventTarget;
}

declare module 'axios' {
    export function mergeConfig(config1: AxiosRequestConfig, config2: AxiosRequestConfig): AxiosRequestConfig
}
