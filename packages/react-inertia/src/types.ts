// This type has been duplicated from @inertiajs/core to
// continue supporting Inertia 1. When we drop version 1
// support we can import this directly from Inertia.
export type FormDataConvertible = Array<FormDataConvertible> | {
    [key: string]: FormDataConvertible;
} | Blob | FormDataEntryValue | Date | boolean | number | null | undefined;

