// packages/ui/src/crud/components/__tests__/cellEditFor.test.ts

import { describe, it, expect } from 'vitest';

import type { EntityField } from '@donotdev/core';

import { cellEditFor } from '../cellEditFor';

const t = (key: string) => `t(${key})`;
const field = (f: Partial<EntityField> & { type: string }) =>
  ({ name: 'f', visibility: 'user', ...f }) as unknown as EntityField;

const REFS = { brands: { b2: 'Zeta', b1: 'Alpha' } };

describe('cellEditFor', () => {
  it('edits text-like and number fields in place', () => {
    expect(cellEditFor(field({ type: 'email' }), 'admin', {}, t)).toEqual({
      type: 'text',
    });
    expect(cellEditFor(field({ type: 'number' }), 'admin', {}, t)).toEqual({
      type: 'number',
    });
  });

  it('lists select options with translated labels', () => {
    const f = field({
      type: 'select',
      validation: { options: [{ value: 'red', label: 'colors.red' }] },
    } as never);
    expect(cellEditFor(f, 'admin', {}, t)).toEqual({
      type: 'select',
      options: [{ value: 'red', label: 't(colors.red)' }],
    });
  });

  it('lists references by resolved label, sorted', () => {
    const f = field({
      type: 'reference',
      validation: { reference: 'brands' },
    } as never);
    expect(cellEditFor(f, 'admin', REFS, t)).toEqual({
      type: 'select',
      options: [
        { value: 'b1', label: 'Alpha' },
        { value: 'b2', label: 'Zeta' },
      ],
    });
  });

  it('keeps unresolved references, unsupported types and non-editable fields read-only', () => {
    const ref = field({
      type: 'reference',
      validation: { reference: 'brands' },
    } as never);
    expect(cellEditFor(ref, 'admin', {}, t)).toBeUndefined();
    expect(
      cellEditFor(field({ type: 'images' }), 'admin', {}, t)
    ).toBeUndefined();
    expect(
      cellEditFor(field({ type: 'text', editable: false }), 'admin', {}, t)
    ).toBeUndefined();
    expect(
      cellEditFor(field({ type: 'text', editable: 'admin' }), 'user', {}, t)
    ).toBeUndefined();
    expect(
      cellEditFor(
        field({ type: 'text', editable: 'create-only' }),
        'admin',
        {},
        t
      )
    ).toBeUndefined();
  });
});
