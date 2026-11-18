// packages/ui/src/crud/components/entityParent.ts

/**
 * @fileoverview Parent / child records (nested lists)
 * @description An `EntityList` with `parent` lists one parent's children and its
 * add button opens `basePath/new?<field>=<id>`. `EntityFormRenderer` (create)
 * prefills that reference field from the URL. `parent.value: null` (parent not
 * created yet) shows the create-first message instead. URL input is untrusted: only
 * reference fields of the entity the viewer may set on create, with an id-shaped
 * value, are taken. Reference fields and editability come from the entity
 * descriptor (`describeEntity`).
 *
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */

import { describeEntity } from '@donotdev/core';
import type { AnyEntity, EntityListParent } from '@donotdev/core';

/** Record id shape accepted from a URL (Firestore ids, UUIDs, slugs). */
const RECORD_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * True when `field` is a reference field of `entity`: descriptor
 * `value.kind === 'ref'` (any field type with `validation.reference`, custom ones included).
 */
const isReferenceField = (entity: AnyEntity, field: string): boolean => {
  const value = Object.hasOwn(entity.fields, field)
    ? describeEntity(entity).fields[field]?.value
    : undefined;
  return value?.kind === 'ref' && value.ref !== undefined;
};

/** A nested list's parent once created (its id known). */
export interface SavedEntityParent extends EntityListParent {
  value: string;
}

/**
 * Throws when `parent.field` is not a reference field of the listed entity, or
 * `parent.value` is neither a record id nor `null` (parent not created yet).
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
  if (parent.value !== null && !RECORD_ID.test(parent.value)) {
    throw new Error(
      `EntityList: parent.value "${parent.value}" is not a record id.`
    );
  }
}

/**
 * Create path of a child record with its parent prefilled.
 *
 * @param basePath - The list's base path
 * @param parent - The nested list's parent (created)
 * @returns `${basePath}/new?<field>=<id>`
 */
export function childCreatePath(
  basePath: string,
  parent: SavedEntityParent
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
      describeEntity(entity).fields[key]?.editableFor(viewerRole, 'create') === true
    ) {
      prefill[key] = value;
    }
  }
  return prefill;
}
