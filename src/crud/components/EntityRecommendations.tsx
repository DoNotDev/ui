'use client';
// packages/ui/src/crud/components/EntityRecommendations.tsx

/**
 * @fileoverview Reusable recommendations section for related entities
 * @description Fetches and displays related entity cards in a grid.
 * Caller defines "related by what" via queryOptions.
 *
 * @version 0.1.0
 * @since 0.0.15
 * @author AMBROISE PARK Consulting
 */

import { Card, Section, Skeleton, Stack } from '@donotdev/components';
import { useTranslation, useBreakpoint } from '@donotdev/core';
import type { EntityRecommendationsProps } from '@donotdev/core';

import { isCrudModuleAvailable, useCrudCardList } from '../crudImports';
import { CrudCard } from './CrudCardLink';

/**
 * Displays a grid of related entity cards.
 * Uses useCrudCardList (listCard schema) so cards render identically to EntityCardList.
 *
 * **Title resolution (i18n):**
 * 1. `title` prop — if provided, used as-is (pre-translated string)
 * 2. `recommendations.title` in entity namespace — consumer override
 * 3. `recommendations.title` in `crud` namespace — framework default ("You may also like")
 *
 * Consumers override by adding to their entity translation file:
 * ```json
 * { "recommendations": { "title": "Similar Apartments" } }
 * ```
 *
 * @example
 * ```tsx
 * // Auto-translated title (entity namespace → crud fallback)
 * <EntityRecommendations
 *   entity={apartmentEntity}
 *   queryOptions={{
 *     where: [
 *       { field: 'district_code', operator: 'eq', value: current.district_code },
 *       { field: 'id', operator: 'neq', value: current.id },
 *     ],
 *     limit: 3,
 *   }}
 * />
 *
 * // Explicit title override
 * <EntityRecommendations
 *   entity={apartmentEntity}
 *   title="Nearby Apartments"
 *   queryOptions={...}
 * />
 * ```
 *
 * @version 0.1.0
 * @since 0.0.15
 * @author AMBROISE PARK Consulting
 */
export function EntityRecommendations({
  entity,
  queryOptions,
  title,
  basePath,
  cols = [1, 1, 3, 3],
  tone,
  className,
}: EntityRecommendationsProps) {
  // Safe guard: isCrudModuleAvailable is a module-level constant (immutable after load).

  if (!isCrudModuleAvailable) return null;

  const { t } = useTranslation([entity.namespace, 'crud']);

  const { items, loading } = useCrudCardList(entity, {
    queryOptions,
  });

  // Must be called before any early return to satisfy Rules of Hooks.
  const bp = useBreakpoint('current');

  if (!loading && items.length === 0) {
    return null;
  }

  const resolvedBasePath = basePath ?? `/${entity.collection}`;
  const resolvedTitle =
    title ?? t('recommendations.title', { defaultValue: 'You may also like' });
  const bpIndex: Record<string, number> = {
    mobile: 0,
    tablet: 1,
    laptop: 2,
    desktop: 3,
  };
  const currentCols =
    (Array.isArray(cols)
      ? cols[bpIndex[bp] ?? 3]
      : typeof cols === 'number'
        ? cols
        : 3) ?? 1;
  const skeletonCount = (typeof currentCols === 'number' ? currentCols : 3) * 3;

  return (
    <Section
      title={resolvedTitle}
      gridCols={cols}
      tone={tone}
      className={className}
    >
      {loading
        ? Array.from({ length: skeletonCount }, (_, i) => (
            <Card
              key={i}
              title={<Skeleton width="60%" />}
              subtitle={<Skeleton width="40%" />}
              content={
                <Stack direction="column" gap="tight">
                  <Skeleton width="80%" />
                  <Skeleton width="50%" />
                </Stack>
              }
              elevated
            />
          ))
        : items.map((item) => (
            <CrudCard
              key={item.id}
              item={item}
              entity={entity}
              detailHref={`${resolvedBasePath}/${item.id}`}
            />
          ))}
    </Section>
  );
}
