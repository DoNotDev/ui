'use client';
// packages/ui/src/crud/components/EntityCardList.tsx

/**
 * @fileoverview Entity Card List Component
 * @description Card grid view for public/user-facing entity browsing.
 * Features: Responsive grid of cards with images, key fields, and navigation to detail pages.
 *
 * **Routing:** Convention basePath = `/${collection}`. View = basePath/:id.
 * Override basePath for nested routes; use onClick(id) to open sheet instead of navigating.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Heart } from 'lucide-react';
import { useMemo, useCallback } from 'react';

import {
  Card,
  Grid,
  Stack,
  Text,
  Skeleton,
  Section,
  Button,
} from '@donotdev/components';
import {
  useTranslation,
  getListCardFieldNames,
  useBreakpoint,
} from '@donotdev/core';
import type { ListCardLayout } from '@donotdev/core';
import type { Entity } from '@donotdev/core';
import type { EntityCardListProps, EntityRecord } from '@donotdev/core';
import {
  isCrudModuleAvailable,
  useCrudCardList,
  EntityFilters,
  useEntityFavorites,
  useCrudFilters,
} from '../crudImports';
import { CrudCard } from './CrudCardLink';
import { useNavigate } from '../../routing';

export type { EntityCardListProps };

/**
 * Resolve skeleton slots from entity shape — mirrors CrudCard's useResolvedSlots exactly.
 * Returns the actual field names per slot so skeletons render the same structure as real cards.
 */
function resolveSkeletonSlots(entity: EntityCardListProps['entity']) {
  const l = entity.listCardFields;
  if (l && !Array.isArray(l)) {
    const layout = l as ListCardLayout;
    return {
      titleFields: layout.title ?? [],
      subtitleFields: layout.subtitle ?? [],
      contentFields: layout.content ?? [],
      footerFields: layout.footer ?? [],
    };
  }
  const fieldsToShow = getListCardFieldNames(entity);
  const isImage = (name: string) => {
    const type = entity.fields[name]?.type;
    return type === 'image' || type === 'images';
  };
  const other = fieldsToShow.filter((n) => !isImage(n));
  const images = fieldsToShow.filter(isImage);
  return {
    titleFields: other.length > 0 ? [other[0]] : [],
    subtitleFields: [] as string[],
    contentFields: [...other.slice(1, 4), ...images],
    footerFields: [] as string[],
  };
}

/**
 * Skeleton grid — renders the same Card structure as CrudCard but with
 * Skeleton elements instead of real data. No hardcoded sizes; the Card's
 * own layout determines the shape.
 */
const BREAKPOINT_INDEX: Record<string, number> = {
  mobile: 0,
  tablet: 1,
  laptop: 2,
  desktop: 3,
};

function CardListSkeleton({
  cols,
  entity,
}: {
  cols: EntityCardListProps['cols'];
  entity: EntityCardListProps['entity'];
}) {
  const slots = resolveSkeletonSlots(entity);
  const bp = useBreakpoint('current');
  const currentCols =
    (Array.isArray(cols)
      ? cols[BREAKPOINT_INDEX[bp] ?? 3]
      : (cols as number)) ?? 1;
  const count = currentCols * 3;
  const isImage = (name: string) => {
    const type = entity.fields[name]?.type;
    return type === 'image' || type === 'images';
  };

  const contentNode =
    slots.contentFields.length > 0 ? (
      <Stack direction="column" gap="tight">
        {slots.contentFields.map((fieldName) =>
          isImage(fieldName) ? (
            <Skeleton key={fieldName} height={120} />
          ) : (
            <div key={fieldName}>
              <Text level="small" variant="muted">
                <Skeleton />
              </Text>
              <Text>
                <Skeleton />
              </Text>
            </div>
          )
        )}
      </Stack>
    ) : undefined;

  const footerNode =
    slots.footerFields.length > 0 ? (
      <Text level="small">
        <Skeleton />
      </Text>
    ) : undefined;

  return (
    <Grid cols={cols}>
      {Array.from({ length: count }, (_, i) => (
        <Card
          key={i}
          title={<Skeleton />}
          subtitle={slots.subtitleFields.length > 0 ? <Skeleton /> : undefined}
          content={contentNode}
          footer={footerNode}
          elevated
        />
      ))}
    </Grid>
  );
}

/**
 * Entity Card List Component - Card grid view for public/user-facing browsing
 *
 * Features:
 * - Responsive card grid layout
 * - Image + key fields display
 * - Click card to navigate to detail
 * - Simple formatted text display (labels + values)
 * - Empty state handling
 * - Auto-routing when handler not provided
 */
export function EntityCardList({
  entity,
  basePath,
  onClick,
  cols = [1, 2, 3, 4],
  staleTime = 1000 * 60 * 30, // 30 minutes default cache
  queryOptions,
  filter,
  hideFilters = false,
  resultLabel,
  tone,
  renderCardOverlay,
  clientSort,
  collapsible = false,
  defaultOpen,
  preview,
}: EntityCardListProps) {
  // Safe guard: isCrudModuleAvailable is a module-level constant (immutable after load).
  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (!isCrudModuleAvailable) return null;

  const isPreview = !!preview;

  const navigate = useNavigate();
  const base = basePath ?? `/${entity.collection}`;

  // useCrudCardList -> handles fetching + client-side filter/search/sort via `processed`
  const {
    items: rawData,
    processed,
    loading: fetchLoading,
    error: fetchError,
  } = useCrudCardList(entity, {
    enabled: !isPreview,
    staleTime,
    queryOptions,
    clientSort,
  });

  // In preview mode: use preview data, skip loading state
  const loading = isPreview ? false : fetchLoading;

  // Favorites - always enabled, no props needed
  const { isFavorite, toggleFavorite, favoritesFilter } = useEntityFavorites({
    collection: entity.collection,
  });

  // Favorites toggle from CrudStore (persists across navigation)
  const { showFavoritesOnly, setShowFavoritesOnly, filters, setFilters } =
    useCrudFilters({
      collection: entity.collection,
    });

  // Apply UI-specific filters (favorites, consumer filter prop) on top of processed
  // Favorites always sort to front; when showFavoritesOnly, only favorites are shown
  let data: (EntityRecord & { id: string })[] = isPreview
    ? (preview as (EntityRecord & { id: string })[])
    : processed;
  if (!isPreview) {
    if (showFavoritesOnly) {
      data = data.filter(favoritesFilter);
    }
    if (filter) {
      data = data.filter(filter);
    }
    // Sort favorites to front (stable sort preserves relative order within each group)
    data = data.toSorted((a, b) => {
      const aFav = isFavorite(String(a.id)) ? 0 : 1;
      const bFav = isFavorite(String(b.id)) ? 0 : 1;
      return aFav - bFav;
    });
  }

  // Entity + crud namespaces so formatValue can resolve crud:price.* etc.
  const { t } = useTranslation([entity.namespace, 'crud']);
  const { t: tCrud } = useTranslation('crud');

  // Card click: onClick(id) if provided, else navigate to basePath/:id
  const handleView = useCallback(
    (id: string) => {
      if (isPreview) return;
      if (onClick) {
        onClick(id);
      } else {
        navigate(`${base}/${id}`);
      }
    },
    [base, navigate, onClick, isPreview]
  );

  // Flat field names for filters (works with both string[] and ListCardLayout)
  const fieldsToFilter = useMemo(() => getListCardFieldNames(entity), [entity]);

  const entityName = t('name', { defaultValue: entity.name });

  return (
    <>
      {/* Filters Section */}
      {!hideFilters && (
        <Section
          title={tCrud('filters.title', {
            entity: entityName,
            defaultValue: `Browse ${entityName} - Filters`,
          })}
          collapsible={collapsible}
          defaultOpen={defaultOpen}
          tone={tone}
        >
          <Card>
            <Stack direction="column">
              {/* Favorites Toggle - always shown */}
              <Button
                variant={
                  !isPreview && showFavoritesOnly ? 'primary' : 'outline'
                }
                icon={<Heart size={18} />}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                disabled={isPreview}
              >
                {showFavoritesOnly
                  ? tCrud('favorites.showAll', { defaultValue: 'Show All' })
                  : tCrud('favorites.showFavorites', {
                      defaultValue: 'Show Favorites',
                    })}
              </Button>

              {!isPreview && (
                <EntityFilters
                  entity={entity}
                  data={rawData}
                  fieldsToFilter={fieldsToFilter}
                />
              )}
            </Stack>
          </Card>
        </Section>
      )}

      {/* Results Section */}
      <Section
        title={
          loading
            ? tCrud('results.title.fetching', { defaultValue: 'Fetching...' })
            : resultLabel
              ? resultLabel(data.length)
              : tCrud('results.title.count', {
                  count: data.length,
                  defaultValue:
                    data.length === 1
                      ? 'Found 1 occurrence'
                      : `Found ${data.length} occurrences`,
                })
        }
        collapsible={collapsible}
        defaultOpen={collapsible ? true : undefined}
        tone={tone}
      >
        {loading ? (
          <CardListSkeleton cols={cols} entity={entity} />
        ) : fetchError ? (
          <Stack
            align="center"
            justify="center"
            style={{ padding: 'var(--gap-3xl)', textAlign: 'center' }}
          >
            <Text level="h3" style={{ color: 'var(--destructive)' }}>
              {tCrud('errors.fetchFailed', {
                defaultValue: `Failed to load ${entity.name.toLowerCase()}`,
              })}
            </Text>
            <Text level="small" style={{ color: 'var(--destructive)' }}>
              {fetchError instanceof Error
                ? fetchError.message
                : String(fetchError)}
            </Text>
          </Stack>
        ) : data.length === 0 ? (
          <Stack
            align="center"
            justify="center"
            style={{ padding: 'var(--gap-3xl)', textAlign: 'center' }}
          >
            <Text level="h3" style={{ color: 'var(--muted-foreground)' }}>
              {tCrud('emptyState.title', {
                defaultValue: `No ${entity.name.toLowerCase()} found`,
              })}
            </Text>
            <Text style={{ color: 'var(--muted-foreground)' }}>
              {tCrud('emptyState.description', {
                defaultValue: `No ${entity.name.toLowerCase()} available at this time.`,
              })}
            </Text>
          </Stack>
        ) : (
          <Grid cols={cols}>
            {/* item type is EntityRecord (Record<string, AnyFieldValue=unknown>); id is guaranteed by data layer */}
            {data.map((item: EntityRecord & { id: string }) => {
              const itemIsFavorite = isFavorite(item.id);
              const detailHref =
                isPreview || onClick ? undefined : `${base}/${item.id}`;

              return (
                <CrudCard
                  key={item.id}
                  item={item}
                  entity={entity}
                  detailHref={detailHref}
                  onClick={
                    isPreview
                      ? undefined
                      : onClick
                        ? () => handleView(item.id)
                        : undefined
                  }
                  renderOverlay={renderCardOverlay?.(item)}
                  renderActions={
                    <Heart
                      fill={itemIsFavorite ? '#ef4444' : '#ffffff'}
                      stroke={
                        itemIsFavorite ? '#ef4444' : 'var(--muted-foreground)'
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isPreview) toggleFavorite(item.id);
                      }}
                      style={{
                        cursor: isPreview ? 'default' : 'pointer',
                        width: 'var(--icon-md)',
                        height: 'var(--icon-md)',
                        transition: 'fill 0.2s, stroke 0.2s',
                        opacity: isPreview ? 0.5 : 1,
                      }}
                      aria-label={
                        itemIsFavorite
                          ? tCrud('favorites.remove', {
                              defaultValue: 'Remove from favorites',
                            })
                          : tCrud('favorites.add', {
                              defaultValue: 'Add to favorites',
                            })
                      }
                    />
                  }
                />
              );
            })}
          </Grid>
        )}
      </Section>
    </>
  );
}
