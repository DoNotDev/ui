'use client';
// packages/ui/src/crud/components/useRecordBreadcrumb.ts

/**
 * @fileoverview Record name in the breadcrumbs
 * @description Publishes the shown record's display name to the layout store, so the
 * breadcrumb of the page whose last URL segment names the record (`/produits/<slug>`,
 * `/products/<uuid>`) reads as the record's name: the name the page's BreadcrumbList
 * JSON-LD ends with (entity pages).
 *
 * @version 0.2.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */

import { useEffect, useRef } from 'react';

import { deriveEntitySeo, useLayout, useTranslation } from '@donotdev/core';
import type { AnyEntity } from '@donotdev/core';
// Platform-specific hooks via conditional exports
import { useParams } from '@donotdev/ui/routing/hooks';

/** A URL param value, decoded (malformed encodings stay as they are). */
function decoded(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * The URL segment value that names the record: the route param filled by the record
 * field of the same name (`/produits/:slug` → `record.slug`, the framework's entity
 * route convention), else the record id.
 *
 * @param record - The shown record
 * @param params - The route's params
 * @returns The decoded segment value, or undefined
 */
function recordSegment(
  record: Record<string, unknown>,
  params: Record<string, string | string[] | undefined>
): string | undefined {
  for (const [name, value] of Object.entries(params)) {
    const field = record[name];
    if (typeof value !== 'string') continue;
    if (typeof field !== 'string' && typeof field !== 'number') continue;
    if (String(field) === value || String(field) === decoded(value)) return String(field);
  }
  return typeof record.id === 'string' ? record.id : undefined;
}


/**
 * Names the shown record in the breadcrumbs: the entity's card title, formatted like
 * the card (the same title `deriveEntitySeo` gives the entity page's metadata and the last
 * BreadcrumbList item), on the segment naming the record ({@link recordSegment}: its slug
 * on `/produits/:slug`, its id on `/products/:id`). Cleared when the page unmounts or the record
 * has no title, unless another component replaced it meanwhile (its label stays). Client effect: the server render names the page by its route title (`routeLabel`).
 *
 * @param entity - Entity of the record
 * @param record - Loaded record (`undefined` / `null` while loading)
 */
export function useRecordBreadcrumb(
  entity: AnyEntity,
  record: Record<string, unknown> | null | undefined
): void {
  const setRecordLabel = useLayout('setRouteRecordLabel');
  // The label currently shown: cleanup clears only its own label, never one another
  // component (e.g. the page) set after it.
  const shown = useLayout('routeRecordLabel');
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const params = useParams();
  // The breadcrumb matches the label to the URL segment equal to `id`
  const id = record ? recordSegment(record, params) : undefined;
  const { t, language } = useTranslation([entity.namespace, 'crud']);
  const label = record
    ? deriveEntitySeo(entity, record, { t, locale: language }).title
    : undefined;

  useEffect(() => {
    if (!id || !label) return;
    setRecordLabel({ id, label });
    return () => {
      const current = shownRef.current;
      if (current?.id === id && current.label === label) setRecordLabel(null);
    };
  }, [id, label, setRecordLabel]);
}
