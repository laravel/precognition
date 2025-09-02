import { defineComponent, h, PropType, ref } from 'vue'
import { Form as InertiaForm } from '@inertiajs/vue3'
import type { FormComponentProps, FormComponentSlotProps, FormDataConvertible } from '@inertiajs/core'
import { formDataToObject, Method } from '@inertiajs/core'
import type { ValidationConfig } from 'laravel-precognition'
import { createValidator, toSimpleValidationErrors } from 'laravel-precognition'

// Thin wrapper over Inertia's <Form> that wires Precognition live validation
export const Form = defineComponent({
  name: 'Form',
  props: {
    // Pass-through Inertia Form props (loosely typed to avoid duplication)
    action: { type: [String, Object] as PropType<FormComponentProps['action']>, default: '' },
    method: { type: String as PropType<FormComponentProps['method']>, default: 'get' },

    // Live validation extras
    precognitive: { type: [Boolean, Object] as PropType<boolean | ValidationConfig>, default: true },
    validateOn: { type: [String, Array] as PropType<'input' | 'change' | 'blur' | Array<'input' | 'change' | 'blur'>>, default: 'change' },
    validationTimeout: { type: Number, default: undefined },
  },
  setup(props, { slots, attrs }) {
    const formRef = ref<any>(null)
    let validator: ReturnType<typeof createValidator> | null = null

    const getAction = () => (typeof props.action === 'object' ? props.action.url : (props.action as string))
    const getMethod = () => ((typeof props.action === 'object' ? props.action.method : props.method).toLowerCase() as Method)

    const ensureValidator = (formEl: HTMLFormElement) => {
      if (validator) return validator
      const initial = formDataToObject(new FormData(formEl)) as Record<string, FormDataConvertible>
      validator = createValidator((client) => {
        const current = formDataToObject(new FormData(formEl)) as Record<string, FormDataConvertible>
        return client[getMethod()](getAction(), current, { precognitive: true })
      }, initial)
        .on('errorsChanged', () => {
          const simple = toSimpleValidationErrors(validator!.errors()) as Record<string, string>
          try {
            formRef.value?.clearErrors()
            formRef.value?.setError(simple)
          } catch {}
        })
      if (typeof props.validationTimeout === 'number') {
        validator.setTimeout(props.validationTimeout)
      }
      return validator
    }

    const shouldValidateField = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      if (!el) return false
      return (
        props.precognitive === true ||
        typeof props.precognitive === 'object' ||
        el.hasAttribute?.('precognitive') ||
        el.hasAttribute?.('data-precognitive') ||
        el.getAttribute?.('data-precognitive') === 'true'
      )
    }

    const onMaybeValidate = (e: Event) => {
      const evType = e.type as 'input' | 'change' | 'blur'
      const types = Array.isArray(props.validateOn) ? props.validateOn : [props.validateOn]
      if (!types.includes(evType)) return

      const formEl = e.currentTarget as HTMLFormElement | null
      if (!formEl || !shouldValidateField(e.target)) return

      const v = ensureValidator(formEl)
      const baseConfig = (typeof props.precognitive === 'object' ? props.precognitive : {}) as ValidationConfig

      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
      const name = target ? target.name : undefined

      try {
        if (name) {
          const data = formDataToObject(new FormData(formEl)) as Record<string, any>
          v.validate(name, data[name], { ...baseConfig, precognitive: true })
        } else {
          v.validate({ ...baseConfig, precognitive: true })
        }
      } catch {}
    }

    return () =>
      h(
        InertiaForm as any,
        {
          ...attrs,
          ref: formRef,
          action: getAction(),
          method: getMethod(),
          onInput: onMaybeValidate,
          onChange: onMaybeValidate,
          onBlur: onMaybeValidate,
        },
        {
          default: slots.default
            ? (slotProps: FormComponentSlotProps) =>
                slots.default?.({ ...slotProps, validating: validator?.validating() ?? false })
            : undefined,
        },
      )
  },
})
