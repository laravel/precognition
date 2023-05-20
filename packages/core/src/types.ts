import { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

export type StatusHandler = (response: AxiosResponse, axiosError?: AxiosError) => unknown

export type ValidationErrors = Record<string, Array<string>>

export type SimpleValidationErrors = Record<string, string>

export type Config = AxiosRequestConfig&{
    validate?: Iterable<string>|ArrayLike<string>,
    onPrecognitionSuccess?: (response: AxiosResponse) => unknown,
    onValidationError?: StatusHandler,
    onUnauthorized?: StatusHandler,
    onForbidden?: StatusHandler,
    onNotFound?: StatusHandler,
    onConflict?: StatusHandler,
    onLocked?: StatusHandler,
    onBefore?: () => boolean,
    onStart?: () => unknown,
    onFinish?: () => unknown,
    fingerprint?: string|null,
    precognitive?: boolean,
}

interface RevalidatePayload {
    data: Record<string, unknown>|null,
}

export type ValidationConfig = Config&{
    onBeforeValidation?: (newRequest: RevalidatePayload, oldRequest: RevalidatePayload) => boolean,
}

export type RequestFingerprintResolver = (config: Config, axios: AxiosInstance) => string|null

export type SuccessResolver = (response: AxiosResponse) => boolean

export interface Client {
    get(url: string, config?: Config): Promise<unknown>,
    post(url: string, data?: Record<string, unknown>, config?: Config): Promise<unknown>,
    patch(url: string, data?: Record<string, unknown>, config?: Config): Promise<unknown>,
    put(url: string, data?: Record<string, unknown>, config?: Config): Promise<unknown>,
    delete(url: string, config?: Config): Promise<unknown>,
    use(axios: AxiosInstance): Client,
    fingerprintRequestsUsing(callback: RequestFingerprintResolver|null): Client,
    determineSuccessUsing(callback: SuccessResolver): Client,
}

export interface Validator {
    validating(): boolean,
    touched(): Array<string>,
    errors(): ValidationErrors,
    valid(): Array<string>,
    hasErrors(): boolean,
    setErrors(errors: ValidationErrors|SimpleValidationErrors): Validator,
    validate(input: string|NamedInputEvent): Validator,
    reset(): Validator,
    setTimeout(duration: number): Validator,
    on(event: keyof ValidatorListeners, callback: () => void): Validator,
}

export interface ValidatorListeners {
    errorsChanged: Array<() => void>,
    validatingChanged: Array<() => void>,
    touchedChanged: Array<() => void>,
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
