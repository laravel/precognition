export * from './http/types.js'
export * from './http/errors.js'

import type { HttpClient, HttpResponse } from './http/types.js'
import type { HttpResponseError } from './http/errors.js'

type FormDataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | Blob
  | File
  | FileList;

type OwnKeys<T> =
  T extends Array<unknown>
      ? Exclude<keyof T, keyof Array<unknown> | number>
      : T extends object
          ? {
              [K in keyof T]: T[K] extends (...args: unknown[]) => unknown
                  ? never
                  : K;
          }[keyof T]
          : never;

// Paths for an array or a numeric-keyed record (Record<number, U>)
// e.g. "users", "users.*", "users.0", "users.*.name", "users.0.name"
type IndexedPath<K extends string, U> =
  | K
  | `${K}.${'*' | number}`
  | (U extends FormDataValue
      ? never
      : `${K}.${'*' | number}.${'*' | PrecognitionPath<U>}`);

// Paths for a string-keyed record (Record<string, U>). Keys are unknown at
// compile time, so any string key is allowed and `${string}` covers the "*"
// wildcard. Sub-paths stay typed, but a `${string}` segment matches dots too,
// so deeper paths aren't fully checked.
// e.g. "meta", "meta.locale", "meta.*.label"
type StringIndexedPath<K extends string, U> =
  | K
  | `${K}.${string}`
  | (U extends FormDataValue
      ? never
      : `${K}.${string}.${'*' | PrecognitionPath<U>}`);

// Build every valid path for a form data object, e.g. for
// { name: string; profile: { bio: string }; users: { name: string }[] }
// this yields "name", "profile", "profile.bio", "users", "users.*.name", etc.
export type PrecognitionPath<Data> = 0 extends 1 & Data
    ? never
    : Data extends object
        ? {
            [K in Extract<OwnKeys<Data>, string>]: 0 extends 1 & Data[K]
                ? never
                // Leaf value first. A `string` is numerically indexable (keyof
                // string includes number), so we catch it before the index checks.
                // e.g. "name", "email"
                : NonNullable<Data[K]> extends FormDataValue
                    ? K
                    // String-keyed record, checked before the numeric one it also satisfies
                    // e.g. "meta.locale", "meta.*.label"
                    : string extends keyof NonNullable<Data[K]>
                        ? StringIndexedPath<K, NonNullable<Data[K]>[string]>
                        // Array or numeric-keyed record
                        // e.g. "users.*", "users.0.name"
                        : number extends keyof NonNullable<Data[K]>
                            ? IndexedPath<K, NonNullable<Data[K]>[number]>
                            // Nested object: the key, a one-level wildcard, or each sub-path
                            // e.g. "profile", "profile.*", "profile.name"
                            : K | `${K}.${'*' | PrecognitionPath<NonNullable<Data[K]>>}`;
        }[Extract<OwnKeys<Data>, string>]
        : never;


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
