// packages/ui/src/crud/components/__tests__/cellEditFor.test.ts

import { afterAll, beforeAll, describe, it, expect } from 'vitest';

import { cellEditEntity } from '@dndev/test-entities';

import { cellEditFor } from '../cellEditFor';

const t = (key: string) => `t(${key})`;
/** The cell edit of one field of the shared `cellEditEntity` (one field per case). */
const edit = (
  name: string,
  role = 'admin',
  refs: Record<string, Record<string, string>> = {},
  language = 'en'
) => cellEditFor(cellEditEntity, name, role, refs, t, language);

// The app's time zone (i18n.timeZone): date-time editors carry it
const previousConfig = globalThis._DNDEV_CONFIG_;
beforeAll(() => {
  // why: only the i18n key getAppTimeZone reads
  globalThis._DNDEV_CONFIG_ = { i18n: { timeZone: 'Europe/Paris' } } as unknown as typeof globalThis._DNDEV_CONFIG_;
});
afterAll(() => {
  globalThis._DNDEV_CONFIG_ = previousConfig;
});

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
  // Owner decision 2026-11-25 I3: sorted in the UI language, like the menu
  it('sorts reference options in the UI language', () => {
    const refs = { brands: { z: 'Zèbre', e: 'Écran', a: 'avoine' } };
    expect(edit('brandId', 'admin', refs, 'fr')).toEqual({
      type: 'select',
      options: [
        { value: 'a', label: 'avoine' },
        { value: 'e', label: 'Écran' },
        { value: 'z', label: 'Zèbre' },
      ],
    });
  });

  // Owner decision 2026-11-25 C1: dates edited in their cells, in the app's zone
  it('edits dates and date-times; generated timestamps stay read-only', () => {
    expect(edit('deliveryDate')).toEqual({ type: 'date', timeZone: 'Europe/Paris' });
    expect(edit('startsAt')).toEqual({ type: 'datetime', timeZone: 'Europe/Paris' });
    expect(edit('paidAt')).toEqual({ type: 'datetime', timeZone: 'Europe/Paris' });
    expect(edit('placedAt')).toBeUndefined();
  });

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
    expect(() => cellEditFor(cellEditEntity, 'missing', 'admin', {}, t, 'en')).toThrow(
      /no field "missing"/
    );
  });
});
