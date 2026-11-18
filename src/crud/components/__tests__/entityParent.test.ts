// packages/ui/src/crud/components/__tests__/entityParent.test.ts

import { describe, it, expect } from 'vitest';


import {
  assertEntityParent,
  childCreatePath,
  referencePrefillFromQuery,
} from '../entityParent';
import { apartmentEntity, parentReferenceEntity as entity } from '@dndev/test-entities';


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

  // Regression (design B10): the reference predicate is the descriptor's
  // (`value.kind === 'ref'`), so a custom type with `validation.reference` is one.
  it('treats a custom type with validation.reference as a reference field', () => {
    const custom = apartmentEntity;
    expect(() => assertEntityParent(custom, { field: 'owner_ref', value: 'o1' })).not.toThrow();
    expect(referencePrefillFromQuery(custom, new URLSearchParams('owner_ref=o1'), 'admin')).toEqual({
      owner_ref: 'o1',
    });
  });
});
