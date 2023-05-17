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
    fingerprint?: string|null,
}

export type RequestFingerprintResolver = (config: Config, axios: AxiosInstance) => string|null

export type SuccessResolver = (response: AxiosResponse) => boolean

export interface Client {
    get(url: string, config?: Config): Promise<unknown>,
    post(url: string, data?: unknown, config?: Config): Promise<unknown>,
    patch(url: string, data?: unknown, config?: Config): Promise<unknown>,
    put(url: string, data?: unknown, config?: Config): Promise<unknown>,
    delete(url: string, config?: Config): Promise<unknown>,
    validator(callback: ClientCallback): Validator,
    use(axios: AxiosInstance): Client,
    fingerprintRequestsUsing(callback: RequestFingerprintResolver|null): Client,
    determineSuccessUsing(callback: SuccessResolver): Client,
}

export interface Validator {
    validate(input: string|NamedInputEvent): Validator,
    touched(): Array<string>,
    setTouched(inputs: Array<string>): Validator,
    passed(): Array<string>,
    errors(): ValidationErrors,
    hasErrors(): boolean,
    setErrors(errors: ValidationErrors|SimpleValidationErrors): Validator,
    validating(): boolean,
    setTimeout(duration: number): Validator,
    on(event: keyof ValidatorListeners, callback: () => void): Validator,
}

export interface ValidatorListeners {
    errorsChanged: Array<() => void>,
    validatingChanged: Array<() => void>,
    touchedChanged: Array<() => void>,
}

export type RequestMethod = 'get'|'post'|'patch'|'put'|'delete'

export type ClientCallback = (client: Pick<Client, RequestMethod>) => Promise<unknown>

interface NamedEventTarget extends EventTarget {
    name: string
}

export interface NamedInputEvent extends InputEvent {
    readonly target: NamedEventTarget;
}
