import { Config, NamedInputEvent, Validator } from 'laravel-precognition'

type Join<
    Key,
    Previous,
    TKey extends number | string = string
> = Key extends TKey
    ? Previous extends TKey
    ? `${Key}${'' extends Previous ? '' : '.'}${Previous}`
    : never
    : never;

type Previous = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];

type Paths<
    TEntity,
    TDepth extends number = 3,
    TKey extends number | string = string
> = [TDepth] extends [never]
    ? never
    : TEntity extends object
    ? {
        [Key in keyof TEntity]-?: Key extends TKey
        ? `${Key}` | Join<Key, Paths<TEntity[Key], Previous[TDepth]>>
        : never;
    }[keyof TEntity]
    : '';


export interface Form<Data extends Record<string, unknown>> {
    processing: boolean,
    validating: boolean,
    touched(name: Paths<Data>): boolean,
    touch(name: string | NamedInputEvent | Array<string>): Form<Data>,
    data: Data,
    setData(key: Data | Paths<Data>, value?: unknown): Form<Data>,
    errors: Partial<Record<Paths<Data>, string>>,
    hasErrors: boolean,
    valid(name: Paths<Data>): boolean,
    invalid(name: Paths<Data>): boolean,
    validate(name?: Paths<Data> | NamedInputEvent): Form<Data>,
    setErrors(errors: Partial<Record<Paths<Data>, string | string[]>>): Form<Data>
    forgetError(string: Paths<Data> | NamedInputEvent): Form<Data>
    setValidationTimeout(duration: number): Form<Data>,
    submit(config?: Config): Promise<unknown>,
    reset(...names: (Paths<Partial<Data>>)[]): Form<Data>,
    validateFiles(): Form<Data>,
    validator(): Validator,
}
