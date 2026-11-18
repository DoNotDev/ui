// packages/ui/src/crud/components/useRecordBreadcrumb.ts

/**
 * @fileoverview Record name in the breadcrumbs
 * @description Publishes the shown record's display name to the layout store, so the
 * breadcrumb segment holding its id (`/products/<uuid>`) reads as the record's name.
 *
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */

import { useEffect, useRef } from 'react';

import { deriveEntitySeo, useLayout, useTranslation } from '@donotdev/core';
import type { AnyEntity } from '@donotdev/core';


/**
 * Names the shown record in the breadcrumbs: the entity's card title, formatted like
 * the card (the same title `<Seo entity>` uses). Cleared when the page unmounts or the record
 * has no title, unless another component replaced it meanwhile (its label stays). Client effect: the server render keeps the URL segment.
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
  const id = typeof record?.id === 'string' ? record.id : undefined;
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
