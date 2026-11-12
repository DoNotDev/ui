// packages/ui/src/crud/components/__tests__/entityParent.test.ts

import { describe, it, expect, vi } from 'vitest';

import { defineEntity } from '@donotdev/core';

vi.mock('../../crudImports', () => ({
  // 'admin-only' fields are not settable by a 'user' viewer
  isFieldEditable: (editable: unknown, role: string) =>
    editable !== 'admin' || role === 'admin',
}));

import {
  assertEntityParent,
  childCreatePath,
  referencePrefillFromQuery,
} from '../entityParent';

const entity = defineEntity({
  name: 'Product',
  collection: 'products',
  fields: {
    name: { name: 'name', label: 'name', type: 'text', visibility: 'admin' },
    brandId: {
      name: 'brandId',
      label: 'brandId',
      type: 'reference',
      visibility: 'admin',
      validation: { reference: 'brands' },
    },
    ownerId: {
      name: 'ownerId',
      label: 'ownerId',
      type: 'reference',
      visibility: 'admin',
      editable: 'admin',
      validation: { reference: 'users' },
    },
  },
});

describe('entityParent', () => {
  it('accepts only a reference field with an id-shaped value', () => {
    expect(() => assertEntityParent(entity, { field: 'brandId', value: 'b-1' })).not.toThrow();
    expect(() => assertEntityParent(entity, { field: 'name', value: 'b1' })).toThrow();
    expect(() => assertEntityParent(entity, { field: 'brandId', value: 'a b' })).toThrow();
  });

  it('builds the child create path with the parent in the query', () => {
    expect(childCreatePath('/produits', { field: 'brandId', value: 'b1' })).toBe(
      '/produits/new?brandId=b1'
    );
  });

  it('takes only settable reference fields with id-shaped values from the URL', () => {
    const params = new URLSearchParams(
      'brandId=b1&name=x&ownerId=u1&__proto__=p&categoryId=c1&brandIdx=1'
    );
    expect(referencePrefillFromQuery(entity, params, 'admin')).toEqual({
      brandId: 'b1',
      ownerId: 'u1',
    });
    expect(referencePrefillFromQuery(entity, params, 'user')).toEqual({ brandId: 'b1' });
    expect(
      referencePrefillFromQuery(entity, new URLSearchParams('brandId=<script>'), 'admin')
    ).toEqual({});
  });
});
