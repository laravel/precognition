import { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios"

export type StatusHandler = (response: AxiosResponse, axiosError?: AxiosError) => unknown

export type ValidationHandler = (errors: ValidationErrors, axiosError: AxiosError) => unknown

export interface ValidationPayload {
    message: string,
    errors: ValidationErrors,
}

export interface ValidationErrors {
    [key: string]: Array<string>,
}

export type Config = AxiosRequestConfig&{
    validate?: Iterable<string>|ArrayLike<string>,
    onPrecognitionSuccess?: StatusHandler,
    onValidationError?: ValidationHandler,
    onUnauthorized?: StatusHandler,
    onForbidden?: StatusHandler,
    onNotFound?: StatusHandler,
    onConflict?: StatusHandler,
    onLocked?: StatusHandler,
    fingerprint?: string|null,
}

export type RequestFingerprintResolver = (config: Config, axios: AxiosInstance) => string|null

export interface Client {
    get(url: string, config: Config): Promise<unknown>,
    post(url: string, data: unknown): Promise<unknown>,
    patch(url: string, data: unknown): Promise<unknown>,
    put(url: string, data: unknown): Promise<unknown>,
    delete(url: string, config: Config): Promise<unknown>,
    use(axios: AxiosInstance): Client,
    fingerprintRequestsUsing(callback: RequestFingerprintResolver|null): Client,
}

export interface PollTimeout {
    milliseconds?: number,
    seconds?: number,
    minutes?: number,
    hours?: number,
}

export interface Poll {
    start(): Poll,
    stop(): Poll,
    every(timeout: PollTimeout): Poll,
    polling(): boolean,
    invocations(): number
}
