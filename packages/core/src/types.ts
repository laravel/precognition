export * from './http/types.js'
export * from './http/errors.js'

import type { HttpClient, HttpResponse } from './http/types.js'
import type { HttpResponseError } from './http/errors.js'

type FormDataValue = string | number | boolean | null | undefined | Date | Blob | File | FileList

export type PrecognitionPath<Data> = 0 extends 1 & Data ? never : Data extends object ? {
    [K in Extract<keyof Data, string>]: 0 extends 1 & Data[K] ? never
        : Data[K] extends Array<infer U>
            ? K | `${K}.*` | (U extends FormDataValue ? never : `${K}.*.${Extract<keyof U, string>}` | `${K}.*.*`)
            : Data[K] extends FormDataValue ? K : K | `${K}.*` | `${K}.${PrecognitionPath<Data[K]>}`
}[Extract<keyof Data, string>] : never

export type StatusHandler = (response: HttpResponse, error?: HttpResponseError) => unknown

export type ValidationErrors = Record<string, Array<string>>

export type SimpleValidationErrors = Record<string, string>

export type Config = {
    method?: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url?: string,
    baseURL?: string,
    data?: unknown,
    params?: Record<string, unknown>,
    headers?: Record<string, string | number | boolean | undefined>,
    signal?: AbortSignal,
    timeout?: number,
    precognitive?: boolean,
    /** @deprecated Use `only` instead */
    validate?: Iterable<string> | ArrayLike<string>,
    only?: Iterable<string> | ArrayLike<string>,
    fingerprint?: string | null,
    onBefore?: () => boolean | undefined,
    onStart?: () => void,
    onSuccess?: (response: HttpResponse) => unknown,
    onPrecognitionSuccess?: (response: HttpResponse) => unknown,
    onValidationError?: StatusHandler,
    onUnauthorized?: StatusHandler,
    onForbidden?: StatusHandler,
    onNotFound?: StatusHandler,
    onConflict?: StatusHandler,
    onLocked?: StatusHandler,
    onFinish?: () => void,
}

interface RevalidatePayload {
    data: Record<string, unknown> | null,
    touched: Array<string>,
}

export type ValidationConfig = Config & {
    onBeforeValidation?: (newRequest: RevalidatePayload, oldRequest: RevalidatePayload) => boolean | undefined,
}

export type RequestFingerprintResolver = (config: Config, httpClient: HttpClient) => string | null

export type SuccessResolver = (response: HttpResponse) => boolean

export interface Client {
    get(url: string, data?: Record<string, unknown>, config?: Config): Promise<unknown>,
    post(url: string, data?: Record<string, unknown>, config?: Config): Promise<unknown>,
    patch(url: string, data?: Record<string, unknown>, config?: Config): Promise<unknown>,
    put(url: string, data?: Record<string, unknown>, config?: Config): Promise<unknown>,
    delete(url: string, data?: Record<string, unknown>, config?: Config): Promise<unknown>,
    useHttpClient(httpClient: HttpClient): Client,
    withBaseURL(url: string): Client,
    withTimeout(duration: number): Client,
    withCredentials(credentials: RequestCredentials | boolean): Client,
    withXsrfCookieName(name: string): Client,
    withXsrfHeaderName(name: string): Client,
    fingerprintRequestsUsing(callback: RequestFingerprintResolver | null): Client,
    determineSuccessUsing(callback: SuccessResolver): Client,
}

export interface Validator {
    touched(): Array<string>,
    validate(input?: string | NamedInputEvent | ValidationConfig, value?: unknown, config?: ValidationConfig): Validator,
    touch(input: string | NamedInputEvent | Array<string>): Validator,
    validating(): boolean,
    valid(): Array<string>,
    errors(): ValidationErrors,
    setErrors(errors: ValidationErrors | SimpleValidationErrors): Validator,
    hasErrors(): boolean,
    forgetError(error: string | NamedInputEvent): Validator,
    reset(...names: string[]): Validator,
    setTimeout(duration: number): Validator,
    on(event: keyof ValidatorListeners, callback: () => void): Validator,
    validateFiles(): Validator,
    withoutFileValidation(): Validator,
    defaults(data: Record<string, unknown>): Validator,
}

export interface ValidatorListeners {
    errorsChanged: Array<() => void>,
    validatingChanged: Array<() => void>,
    touchedChanged: Array<() => void>,
    validatedChanged: Array<() => void>,
}

export type RequestMethod = 'get' | 'post' | 'patch' | 'put' | 'delete'

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
