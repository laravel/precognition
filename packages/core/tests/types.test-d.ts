import { describe, it, expectTypeOf } from 'vitest'
import type { PrecognitionPath } from '../src/index.js'

type Company = {
    name: string;
    addresses: string[];
};

type Data = {
    name: string;
    profile: {
        age: number;
        city: string;
    };
    users: { name: string; email: string }[];
    tags: string[];
    company: Company;
    nested: {
        companies: Company[];
    };
    meta: Record<string, string>;
    scores: Record<number, number>;
};

type Path = PrecognitionPath<Data>

describe('PrecognitionPath accepts valid paths', () => {
    it('top-level leaf and object/array roots', () => {
        expectTypeOf<'name'>().toExtend<Path>()
        expectTypeOf<'profile'>().toExtend<Path>()
        expectTypeOf<'users'>().toExtend<Path>()
        expectTypeOf<'tags'>().toExtend<Path>()
        expectTypeOf<'company'>().toExtend<Path>()
    })

    it('nested object paths', () => {
        expectTypeOf<'profile.age'>().toExtend<Path>()
        expectTypeOf<'profile.city'>().toExtend<Path>()
        expectTypeOf<'profile.*'>().toExtend<Path>()
        expectTypeOf<'company.name'>().toExtend<Path>()
        expectTypeOf<'company.addresses'>().toExtend<Path>()
    })

    it('array wildcard paths', () => {
        expectTypeOf<'users.*'>().toExtend<Path>()
        expectTypeOf<'users.*.name'>().toExtend<Path>()
        expectTypeOf<'users.*.email'>().toExtend<Path>()
        expectTypeOf<'users.*.*'>().toExtend<Path>()
        expectTypeOf<'tags.*'>().toExtend<Path>()
    })

    it('indexed element paths', () => {
        expectTypeOf<'users.0'>().toExtend<Path>()
        expectTypeOf<'users.0.name'>().toExtend<Path>()
        expectTypeOf<'users.0.email'>().toExtend<Path>()
        expectTypeOf<'users.42.name'>().toExtend<Path>()
        expectTypeOf<'tags.0'>().toExtend<Path>()
    })

    it('deeply nested array-of-object paths', () => {
        expectTypeOf<'nested'>().toExtend<Path>()
        expectTypeOf<'nested.companies'>().toExtend<Path>()
        expectTypeOf<'nested.companies.*'>().toExtend<Path>()
        expectTypeOf<'nested.companies.0'>().toExtend<Path>()
        expectTypeOf<'nested.companies.*.name'>().toExtend<Path>()
        expectTypeOf<'nested.companies.0.name'>().toExtend<Path>()
        expectTypeOf<'nested.companies.*.addresses'>().toExtend<Path>()
        expectTypeOf<'nested.companies.0.addresses'>().toExtend<Path>()
    })

    it('record-keyed paths', () => {
        expectTypeOf<'meta'>().toExtend<Path>()
        expectTypeOf<'meta.anyKey'>().toExtend<Path>()
        expectTypeOf<'scores'>().toExtend<Path>()
        expectTypeOf<'scores.0'>().toExtend<Path>()
    })
})

describe('PrecognitionPath rejects invalid paths', () => {
    it('nonexistent fields', () => {
        // @ts-expect-error - no such top-level field
        expectTypeOf<'nonexistent'>().toExtend<Path>()
        // @ts-expect-error - no such nested field
        expectTypeOf<'profile.country'>().toExtend<Path>()
        // @ts-expect-error - no such property on array items
        expectTypeOf<'users.*.unknown'>().toExtend<Path>()
        // @ts-expect-error - no such property on indexed item
        expectTypeOf<'users.0.unknown'>().toExtend<Path>()
    })

    it('paths into leaf values', () => {
        // @ts-expect-error - age is a number, has no sub-paths
        expectTypeOf<'profile.age.foo'>().toExtend<Path>()
        // @ts-expect-error - a leaf has no wildcard children
        expectTypeOf<'profile.*.*'>().toExtend<Path>()
    })

    it('missing index/wildcard for array access', () => {
        // @ts-expect-error - array item field needs an index or wildcard
        expectTypeOf<'users.name'>().toExtend<Path>()
        // @ts-expect-error - array item field needs an index or wildcard
        expectTypeOf<'users.email'>().toExtend<Path>()
    })

    it('array built-ins and methods are not paths', () => {
        // @ts-expect-error - Array.length is not a field
        expectTypeOf<'users.length'>().toExtend<Path>()
        // @ts-expect-error - Array.push is not a field
        expectTypeOf<'users.push'>().toExtend<Path>()
        // @ts-expect-error - Array.map is not a field
        expectTypeOf<'tags.map'>().toExtend<Path>()
    })
})

type Errors = Partial<Record<Path, string>>

describe('PrecognitionPath in record-key position (errors / setErrors)', () => {
    it('accepts valid keys in an object literal', () => {
        expectTypeOf<{
            'name': string;
            'profile.age': string;
            'users.0.name': string;
            'users.*.name': string;
            'company.name': string;
            'meta.anyKey': string;
        }>().toExtend<Errors>()
    })

    it('rejects unknown keys in an object literal', () => {
        const errors: Errors = {
            // @ts-expect-error - no such path
            'users.0.unknown': 'Required',
        }
        return errors
    })

    it('accepts indexed access by a valid path', () => {
        expectTypeOf<Errors['users.0.name']>().toEqualTypeOf<string | undefined>()
        expectTypeOf<Errors['profile.age']>().toEqualTypeOf<string | undefined>()
    })

    it('rejects indexed access by an invalid path', () => {
        // @ts-expect-error - no such path
        expectTypeOf<Errors['users.0.unknown']>()
    })

})
