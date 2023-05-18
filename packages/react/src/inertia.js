// import { toSimpleValidationErrors } from 'laravel-precognition'
// import { RequestMethods, SimpleValidationErrors, Validator } from 'laravel-precognition/dist/types'
// import { InertiaForm } from './types'

// export const patchInertiaForm = (method: RequestMethods, url: string, form: InertiaForm, validator: Validator) => {
//     /**
//      * The original Inertia submit function.
//      */
//     const submit = form.submit.bind(form)

//     /**
//      * Update the errors when validation occurs.
//      */
//     validator.on('errorsChanged', () => form.clearErrors().setError(
//         toSimpleValidationErrors(validator.errors())
//     ))

//     /**
//      * Patch the form.
//      */
//     return Object.assign(form, {
//         submit(m: any = {}, u?: string, o?: any): void {
//             const patchedFunctionCall = typeof m !== 'string'

//             o = patchedFunctionCall ? m : o

//             const options = {
//                 ...o,
//                 onError: (errors: SimpleValidationErrors): any => {
//                     validator.setErrors(errors)

//                     if (o.onError) {
//                         return o.onError(errors)
//                     }
//                 },
//             }

//             submit(
//                 patchedFunctionCall ? method : m,
//                 (patchedFunctionCall ? url : u) as string,
//                 options
//             )
//         },
//     })
// }
