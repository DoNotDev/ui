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

import { useEffect } from 'react';

import { deriveEntitySeo, useLayout, useTranslation } from '@donotdev/core';
import type { AnyEntity } from '@donotdev/core';


/**
 * Names the shown record in the breadcrumbs: the entity's card title, formatted like
 * the card (the same title `<Seo entity>` uses). Cleared when the page unmounts or the record
 * has no title. Client effect: the server render keeps the URL segment.
 *
 * @param entity - Entity of the record
 * @param record - Loaded record (`undefined` / `null` while loading)
 */
export function useRecordBreadcrumb(
  entity: AnyEntity,
  record: Record<string, unknown> | null | undefined
): void {
  const setRecordLabel = useLayout('setRouteRecordLabel');
  const id = typeof record?.id === 'string' ? record.id : undefined;
  const { t, language } = useTranslation([entity.namespace, 'crud']);
  const label = record
    ? deriveEntitySeo(entity, record, { t, locale: language }).title
    : undefined;

  useEffect(() => {
    if (!id || !label) return;
    setRecordLabel({ id, label });
    return () => setRecordLabel(null);
  }, [id, label, setRecordLabel]);
}
