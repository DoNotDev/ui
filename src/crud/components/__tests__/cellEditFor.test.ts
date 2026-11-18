// packages/ui/src/crud/components/__tests__/cellEditFor.test.ts

import { describe, it, expect } from 'vitest';

import { cellEditEntity } from '@dndev/test-entities';

import { cellEditFor } from '../cellEditFor';

const t = (key: string) => `t(${key})`;
/** The cell edit of one field of the shared `cellEditEntity` (one field per case). */
const edit = (
  name: string,
  role = 'admin',
  refs: Record<string, Record<string, string>> = {}
) => cellEditFor(cellEditEntity, name, role, refs, t);

const REFS = { brands: { b2: 'Zeta', b1: 'Alpha' } };

describe('cellEditFor', () => {
  it('edits text-like and number fields in place', () => {
    expect(edit('email')).toEqual({ type: 'text' });
    expect(edit('quantity')).toEqual({ type: 'number' });
  });

  it('lists select options with translated labels', () => {
    expect(edit('color')).toEqual({
      type: 'select',
      options: [{ value: 'red', label: 't(colors.red)' }],
    });
  });

  it('lists references by resolved label, sorted', () => {
    expect(edit('brandId', 'admin', REFS)).toEqual({
      type: 'select',
      options: [
        { value: 'b1', label: 'Alpha' },
        { value: 'b2', label: 'Zeta' },
      ],
    });
  });

  // Regression (design B10): a custom type with validation.reference is a reference.
  it('lists a custom-type reference like a built-in one', () => {
    expect(edit('brandRef', 'admin', REFS)).toMatchObject({
      type: 'select',
      options: [{ value: 'b1' }, { value: 'b2' }],
    });
  });

  it('keeps unresolved references, unsupported types and non-editable fields read-only', () => {
    expect(edit('brandId')).toBeUndefined();
    expect(edit('images')).toBeUndefined();
    expect(edit('locked')).toBeUndefined();
    expect(edit('adminOnly', 'user')).toBeUndefined();
    expect(edit('createOnly')).toBeUndefined();
    expect(edit('computed')).toBeUndefined();
  });

  // Regression (design B12): technical fields are read-only in grids, as in forms.
  it('keeps technical fields read-only unless editable says otherwise', () => {
    expect(edit('technical', 'super')).toBeUndefined();
    expect(edit('technicalAdmin')).toEqual({ type: 'text' });
  });

  it('throws for a field the entity does not have', () => {
    expect(() => cellEditFor(cellEditEntity, 'missing', 'admin', {}, t)).toThrow(
      /no field "missing"/
    );
  });
});
