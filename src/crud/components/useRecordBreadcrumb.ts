'use client';
// packages/ui/src/crud/components/useRecordBreadcrumb.ts

/**
 * @fileoverview Record name in the breadcrumbs and the page title
 * @description Publishes the shown record's display name to the layout store, so the
 * page whose last URL segment names the record (`/produits/<slug>`, `/products/<uuid>`)
 * reads as the record's name ({@link shownRecordLabel}): its breadcrumb (the name the
 * page's BreadcrumbList JSON-LD ends with, entity pages) and, where the page has no
 * server metadata, its `<title>` (`AutoMetaTags`: `<record name> | <site name>`).
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
 * Name of the record the URL shows: the label {@link useRecordBreadcrumb} published, when
 * the URL's last segment (decoded) is the record's segment (its slug or id). The one rule
 * of the page's breadcrumb (`Breadcrumbs`) and its `<title>` (`AutoMetaTags`): another
 * URL never reads a record label left by the previous page.
 *
 * @param pathname - The current route path
 * @param recordLabel - The layout store's `routeRecordLabel`
 * @returns The record's name, or undefined when the URL does not name the labelled record
 * @since 0.3.7
 */
export function shownRecordLabel(
  pathname: string,
  recordLabel: { id: string; label: string } | null
): string | undefined {
  const lastSegment = pathname.split('/').filter(Boolean).at(-1);
  return recordLabel && lastSegment && decoded(lastSegment) === recordLabel.id
    ? recordLabel.label
    : undefined;
}

/**
 * Names the shown record in the breadcrumbs and, on a page without server metadata
 * (Next private entity page, Vite page not prerendered), in its `<title>`
 * (`<record name> | <site name>`): the entity's card title, formatted like the card (the
 * same title `deriveEntitySeo` gives the entity page's metadata and the last
 * BreadcrumbList item), on the segment naming the record ({@link recordSegment}: its slug
 * on `/produits/:slug`, its id on `/products/:id`). Cleared when the page unmounts or the
 * record has no title, unless another component replaced it meanwhile (its label stays).
 * Client effect: the server render names the page by its route title (`routeLabel`).
 * `EntityDisplayRenderer` and `EntityFormRenderer` call it; a page rendering its record
 * itself calls it with the record it shows.
 *
 * @example
 * ```tsx
 * import { productEntity } from 'entities';
 *
 * export default function ProductPage() {
 *   const product = useProduct(useRouteParam('slug'));
 *   useRecordBreadcrumb(productEntity, product);
 *   // ...
 * }
 * ```
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
