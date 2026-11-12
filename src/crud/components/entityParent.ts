// packages/ui/src/crud/components/entityParent.ts

/**
 * @fileoverview Parent / child records (nested lists)
 * @description An `EntityList` with `parent` lists one parent's children and its
 * add button opens `basePath/new?<field>=<id>`. `EntityFormRenderer` (create)
 * prefills that reference field from the URL. URL input is untrusted: only
 * reference fields of the entity the viewer may set on create, with an id-shaped
 * value, are taken.
 *
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */

import type { AnyEntity, EntityListParent } from '@donotdev/core';

import { isFieldEditable } from '../crudImports';

/** Record id shape accepted from a URL (Firestore ids, UUIDs, slugs). */
const RECORD_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** True when `field` is a reference field of `entity`. */
const isReferenceField = (entity: AnyEntity, field: string): boolean =>
  entity.fields[field]?.type === 'reference' &&
  typeof entity.fields[field]?.validation?.reference === 'string';

/**
 * Throws when `parent.field` is not a reference field of the listed entity.
 * A wrong parent would silently list nothing.
 *
 * @param entity - The listed (child) entity
 * @param parent - The nested list's parent
 */
export function assertEntityParent(
  entity: AnyEntity,
  parent: EntityListParent
): void {
  if (!isReferenceField(entity, parent.field)) {
    throw new Error(
      `EntityList: parent.field "${parent.field}" is not a reference field of entity "${entity.name}".`
    );
  }
  if (!RECORD_ID.test(parent.value)) {
    throw new Error(
      `EntityList: parent.value "${parent.value}" is not a record id.`
    );
  }
}

/**
 * Create path of a child record with its parent prefilled.
 *
 * @param basePath - The list's base path
 * @param parent - The nested list's parent
 * @returns `${basePath}/new?<field>=<id>`
 */
export function childCreatePath(
  basePath: string,
  parent: EntityListParent
): string {
  const query = new URLSearchParams({ [parent.field]: parent.value });
  return `${basePath}/new?${query.toString()}`;
}

/**
 * Create-form values taken from the URL: reference fields of the entity the
 * viewer may set on create, whose value is a record id. Anything else is ignored.
 *
 * @param entity - The entity being created
 * @param params - The current URL's search params
 * @param viewerRole - The viewer's role
 * @returns The prefilled reference values (empty when none)
 */
export function referencePrefillFromQuery(
  entity: AnyEntity,
  params: URLSearchParams,
  viewerRole: string
): Record<string, string> {
  const prefill: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (
      Object.hasOwn(entity.fields, key) &&
      isReferenceField(entity, key) &&
      RECORD_ID.test(value) &&
      isFieldEditable(entity.fields[key]!.editable, viewerRole, 'create')
    ) {
      prefill[key] = value;
    }
  }
  return prefill;
}
