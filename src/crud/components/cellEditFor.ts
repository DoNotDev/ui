// packages/ui/src/crud/components/cellEditFor.ts

/**
 * @fileoverview Cell editor of an entity field
 * @description Maps an entity field to the DataTable cell editor used by an
 * `editable` EntityList.
 *
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */

import type { TableCellEdit } from '@donotdev/components';
import type { EntityField } from '@donotdev/core';

import { isFieldEditable, translateLabel } from '../crudImports';

/** Field types edited as free text in an editable list. */
const TEXT_TYPES = new Set(['text', 'email', 'url', 'tel', 'textarea']);
/** Field types edited as a dropdown of their `validation.options`. */
const OPTION_TYPES = new Set(['select', 'radio']);

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Cell editor of a list field, or `undefined` when the field is not edited in
 * the table (type without a cell editor, or not editable by the viewer).
 * References list the referenced records by their resolved label
 * (`useReferenceResolver`); a reference whose collection is not resolved yet
 * stays read-only.
 *
 * @example
 * ```ts
 * cellEditFor({ name: 'price', type: 'number', visibility: 'user' }, 'admin', {}, t);
 * // { type: 'number' }
 * ```
 */
export function cellEditFor(
  field: EntityField,
  viewerRole: string,
  referenceData: Record<string, Record<string, string>>,
  t: Translate
): TableCellEdit | undefined {
  if (!isFieldEditable(field.editable, viewerRole, 'edit')) return undefined;
  const type = field.type || 'text';
  if (TEXT_TYPES.has(type)) return { type: 'text' };
  if (type === 'number') return { type: 'number' };
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
  if (type === 'reference') {
    const collection = field.validation?.reference;
    const labels =
      typeof collection === 'string' ? referenceData[collection] : undefined;
    if (!labels) return undefined;
    return {
      type: 'select',
      options: Object.entries(labels)
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    };
  }
  return undefined;
}
