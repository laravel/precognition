import { SimpleValidationErrors, ValidationErrors } from './types'

export const toSimpleValidationErrors = (errors: ValidationErrors|SimpleValidationErrors): SimpleValidationErrors => {
    return Object.keys(errors).reduce((carry, key) => ({
        ...carry,
        [key]: Array.isArray(errors[key]) ? errors[key][0] : errors[key],
    }), {})
}

