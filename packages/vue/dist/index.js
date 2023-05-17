import precognitive, { toSimpleValidationErrors } from 'laravel-precognition';
import { computed, reactive, ref } from 'vue';
import cloneDeep from 'lodash.clonedeep';
export const useForm = (method, url, data, config) => {
    /**
     * The original user supplied data.
     */
    const defaults = cloneDeep(data ?? {});
    /**
     * The form instance...
     */
    let form = reactive(defaults ?? {});
    /**
     * Base validator.
     */
    const validator = precognitive.validate(client => {
        const m = method.toLowerCase();
        return m === 'get' || m === 'delete' ? client[m](url, config) : client[m](url, form.data(), config);
    });
    /**
     * Reactive validating state.
     */
    const validating = ref(validator.validating());
    validator.on('validatingChanged', () => validating.value = validator.validating());
    /**
     * Reactive processing validation state.
     */
    const processingValidation = ref(validator.processingValidation());
    validator.on('processingValidationChanged', () => processingValidation.value = validator.processingValidation());
    /**
     * Reactive touched inputs state.
     */
    const touched = ref(validator.touched());
    validator.on('touchedChanged', () => touched.value = validator.touched());
    /**
     * Reactive passed validation state.
     */
    const passed = computed(() => touched.value.filter((name) => typeof form.errors[name] === 'undefined'));
    /**
     * Reactive errors state.
     */
    const errors = ref(toSimpleValidationErrors(validator.errors()));
    validator.on('errorsChanged', () => errors.value = toSimpleValidationErrors(validator.errors()));
    /**
     * Reactive hasErrors state.
     */
    const hasErrors = computed(() => Object.keys(errors.value).length > 0);
    return Object.assign(form, {
        validate(input) {
            validator.validate(input);
            return this;
        },
        validating(name) {
            if (typeof name !== 'string') {
                return;
                // touched diff passed
            }
            return this.touched.value.includes(name) && this.
            ;
        },
        processingValidation,
        passed,
        touched,
        errors,
        hasErrors,
        setErrors(errors) {
            validator.setErrors(errors);
            return this;
        },
        clearErrors() {
            validator.clearErrors();
            return this;
        },
        setValidationTimeout(timeout) {
            validator.setTimeout(timeout);
            return this;
        },
        data() {
            return Object.keys(defaults).reduce((carry, key) => ({
                ...carry,
                [key]: this[key],
            }), {});
        },
        reset(...keys) {
            const clonedDefaults = cloneDeep(defaults);
            keys = keys.length === 0
                ? Object.keys(defaults)
                : keys;
            keys.forEach(key => {
                form[key] = clonedDefaults[key];
            });
            return this;
        },
        submit: async (config) => precognitive.axios()[method](url, this.data(), config)
            .catch((error) => {
            if (error.response?.status === 422) {
                this.setErrors(error.response.data.errors);
            }
            return Promise.reject(error);
        })
    });
    export { precognitive as default };
};
