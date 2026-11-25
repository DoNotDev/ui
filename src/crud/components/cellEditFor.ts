// packages/ui/src/crud/components/cellEditFor.ts

/**
 * @fileoverview Cell editor of an entity field
 * @description Maps an entity field to the DataTable cell editor used by an
 * `editable` EntityList. Editability and references come from the entity
 * descriptor (`describeEntity`), the same rules as forms.
 *
 * @version 0.3.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */

import type { TableCellEdit } from '@donotdev/components';
import { describeEntity, getAppTimeZone } from '@donotdev/core';
import type { AnyEntity } from '@donotdev/core';

import { translateLabel } from '../crudImports';

/** Field types edited as free text in an editable list. */
const TEXT_TYPES = new Set(['text', 'email', 'url', 'tel', 'textarea']);
/** Field types edited as a dropdown of their `validation.options`. */
const OPTION_TYPES = new Set(['select', 'radio']);
/** Field types edited as a date-time (DateTimePicker), stored as a UTC instant. */
const DATE_TIME_TYPES = new Set(['datetime-local', 'timestamp']);

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Cell editor of a list field, or `undefined` when the field is not edited in
 * the table (type without a cell editor, or not editable by the viewer).
 * Editability is the form's (`editableFor(viewerRole, 'edit')`): generated,
 * computed, `editable: false`, create-only, role-denied and technical fields stay
 * read-only. References (any field type with `validation.reference`, descriptor
 * `value.kind === 'ref'`) list the referenced records by their resolved label
 * (`useReferenceResolver`), sorted in the UI language; a reference whose collection is
 * not resolved yet stays read-only. `date` fields get the `date` editor (DatePicker,
 * `YYYY-MM-DD`), `datetime-local` / `timestamp` fields the `datetime` editor
 * (DateTimePicker: a wall time in the app's zone, stored as its UTC instant); both carry
 * the app's zone (`getAppTimeZone()`).
 *
 * @param entity - Entity owning the field (the extension entity for an extension column)
 * @param name - Field name in `entity.fields` (unprefixed)
 * @param viewerRole - Viewer's role
 * @param referenceData - Resolved reference labels by collection
 * @param t - Translator for option labels
 * @param language - UI language (i18next `language`): the order of reference options
 * @returns The cell editor, or `undefined`
 * @throws When `entity` has no field `name`; for a date or date-time field, when the
 *   app's time zone is not loaded (`getAppTimeZone`)
 *
 * @example
 * ```ts
 * cellEditFor(productEntity, 'price', 'admin', {}, t, 'fr');
 * // { type: 'number' }
 * cellEditFor(campaignEntity, 'startsAt', 'admin', {}, t, 'fr');
 * // { type: 'datetime', timeZone: 'Europe/Paris' }
 * ```
 *
 * @version 0.3.0
 * @since 0.2.3
 */
export function cellEditFor(
  entity: AnyEntity,
  name: string,
  viewerRole: string,
  referenceData: Record<string, Record<string, string>>,
  t: Translate,
  language: string
): TableCellEdit | undefined {
  const field = entity.fields[name];
  const descriptor = describeEntity(entity).fields[name];
  if (!field || !descriptor) {
    throw new Error(`cellEditFor: entity "${entity.name}" has no field "${name}".`);
  }
  if (!descriptor.editableFor(viewerRole, 'edit')) return undefined;
  const { value } = descriptor;
  if (value.kind === 'ref' && value.ref !== undefined) {
    const labels = referenceData[value.ref];
    if (!labels) return undefined;
    return {
      type: 'select',
      options: Object.entries(labels)
        .map(([id, label]) => ({ value: id, label }))
        // UI language: the same order on the server render and the client
        .sort((a, b) =>
          a.label.localeCompare(b.label, language, { sensitivity: 'base' })
        ),
    };
  }
  const { type } = field;
  if (TEXT_TYPES.has(type)) return { type: 'text' };
  if (type === 'number') return { type: 'number' };
  // The app's zone: a date-time's wall time, the day a stored instant falls on
  if (type === 'date') return { type: 'date', timeZone: getAppTimeZone() };
  if (DATE_TIME_TYPES.has(type)) {
    return { type: 'datetime', timeZone: getAppTimeZone() };
  }
  if (OPTION_TYPES.has(type)) {
    const raw = field.validation?.options;
    const options = typeof raw === 'function' ? raw() : raw;
    if (!Array.isArray(options)) return undefined;
    return {
      type: 'select',
      options: options.map((o: { value: string; label: string }) => ({
        value: String(o.value),
        label: translateLabel(o.label, t),
      })),
    };
  }
  return undefined;
}
