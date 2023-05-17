import { Config } from 'laravel-precognition/dist/types';
export declare const useForm: <TForm extends Record<string, unknown>>(method: RequestMethods, url: string, data?: TForm | undefined, config?: Config) => PrecognitiveForm;
