import { describe, it, expectTypeOf } from 'vitest'
import type { Form } from '../src/types.js'

type User = {
    name: string;
    email: string;
};

type Company = {
    name: string;
    addresses: string[];
};

type FormData = {
    users: User[];
    profile: {
        age: number;
        city: string;
    };
    company: Company;
    nested: {
        companies: Company[];
    };
};

// Helper: extract the validate parameter type once
type ValidateParam = Parameters<Form<FormData>['validate']>[0];

describe('PrecognitionPath type safety', () => {
    it('accepts valid array field paths', () => {
        expectTypeOf<'users'>().toExtend<ValidateParam>()
        expectTypeOf<'users.*'>().toExtend<ValidateParam>()
        expectTypeOf<'users.*.email'>().toExtend<ValidateParam>()
        expectTypeOf<'users.*.name'>().toExtend<ValidateParam>()
        expectTypeOf<'users.*.*'>().toExtend<ValidateParam>()
    })

    it('accepts valid object field paths', () => {
        expectTypeOf<'profile'>().toExtend<ValidateParam>()
        expectTypeOf<'profile.*'>().toExtend<ValidateParam>()
        expectTypeOf<'profile.age'>().toExtend<ValidateParam>()
    })

    it('accepts valid nested paths', () => {
        expectTypeOf<'company'>().toExtend<ValidateParam>()
        expectTypeOf<'company.addresses'>().toExtend<ValidateParam>()

        expectTypeOf<'nested'>().toExtend<ValidateParam>()
        expectTypeOf<'nested.companies'>().toExtend<ValidateParam>()
        expectTypeOf<'nested.companies.*'>().toExtend<ValidateParam>()
        expectTypeOf<'nested.companies.*.name'>().toExtend<ValidateParam>()
        expectTypeOf<'nested.companies.*.addresses'>().toExtend<ValidateParam>()
        expectTypeOf<'nested.companies.*.*'>().toExtend<ValidateParam>()
    })

    it('rejects invalid paths', () => {
        // @ts-expect-error nonexistent property in array items
        expectTypeOf<'users.*.unknown'>().toExtend<ValidateParam>()

        // @ts-expect-error missing wildcard for array access
        expectTypeOf<'users.email'>().toExtend<ValidateParam>()

        // @ts-expect-error invalid deep nesting
        expectTypeOf<'profile.age.foo'>().toExtend<ValidateParam>()

        // @ts-expect-error field does not exist
        expectTypeOf<'nonexistent'>().toExtend<ValidateParam>()

        // @ts-expect-error no such field
        expectTypeOf<'profile.country'>().toExtend<ValidateParam>()

        // @ts-expect-error no such depth
        expectTypeOf<'profile.*.*'>().toExtend<ValidateParam>()
    })
})
