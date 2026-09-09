'use client';
// packages/ui/src/crud/components/EntityList.tsx

/**
 * @fileoverview Entity List Component
 * @description Table view for admin/internal CRUD operations.
 * Features: Filters section + Results section with DataTable
 *
 * **Routing:** Convention basePath = `/${collection}`. View/Edit = basePath/:id, Create = basePath/new.
 * Override basePath for nested routes; use onClick(id) to open sheet instead of navigating.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { RefreshCw, Plus, Trash2, Edit, Search } from 'lucide-react';
import { useCallback, useState } from 'react';

import {
  DataTable,
  Button,
  Stack,
  ActionButton,
  Section,
  Input,
} from '@donotdev/components';
import type { TableColumn } from '@donotdev/components';
import { useTranslation } from '@donotdev/core';
import type { Entity } from '@donotdev/core';
import type { EntityListProps } from '@donotdev/core';
import type { InferEntityData } from '@donotdev/crud';

import { Link, useNavigate } from '../../routing';
import {
  isCrudModuleAvailable,
  translateFieldLabel,
  useCrud,
  useCrudList,
  useCrudPageSize,
  EntityFilters,
  formatValue,
  useReferenceResolver,
} from '../crudImports';

export type { EntityListProps };

/**
 * Entity List Component - Table view for admin/internal operations
 *
 * Features:
 * - Filters section (collapsible) with actions and filter inputs
 * - Results section (collapsible) with DataTable
 * - Excel-like table display with formatted values
 * - Edit and Delete actions (admin only)
 * - Auto-routing when handlers not provided
 */
export function EntityList({
  entity,
  basePath,
  onClick,
  hideFilters = false,
  pagination = 'auto',
  pageSize: pageSizeProp,
  queryOptions,
  exportable = true,
  preview,
  tone,
}: EntityListProps) {
  // Safe guard: isCrudModuleAvailable is a module-level constant (immutable after load).

  if (!isCrudModuleAvailable) return null;

  const isPreview = !!preview;

  const navigate = useNavigate();
  const base = basePath ?? `/${entity.collection}`;

  // Pre-fetch referenced collections for display resolution
  const referenceData = useReferenceResolver(entity, !isPreview);

  // Infer entity data type (includes id from store)
  type EntityData = InferEntityData<typeof entity> & { id: string };

  // Server-side pagination state (only used when pagination='server')
  const [currentPage, setCurrentPage] = useState(1);

  // Persisted page size — survives navigation, per collection
  const { pageSize: storedPageSize, setPageSize: setStoredPageSize } =
    useCrudPageSize({
      collection: entity.collection,
      ...(pageSizeProp != null && { defaultPageSize: pageSizeProp }),
    });

  const [searchQuery, setSearchQuery] = useState<string>('');

  // useCrudList now handles client-side filter + search + sort via `processed`
  // effectiveMode tells us if auto-mode switched to server (for DataTable props)
  const {
    data: listData,
    items: rawData,
    processed: fetchedData,
    loading: fetchLoading,
    mutate: refreshList,
    effectiveMode,
  } = useCrudList(entity, {
    enabled: !isPreview,
    pagination,
    searchQuery,
    ...(queryOptions && { queryOptions }),
    ...((pagination === 'server' || pagination === 'auto') && {
      page: currentPage,
      pageSize: storedPageSize,
    }),
  });

  // In preview mode: use preview data, skip loading state
  const filteredData = isPreview
    ? (preview as unknown as EntityData[])
    : fetchedData;
  const loading = isPreview ? false : fetchLoading;

  // useCrud -> handles actions (delete)
  const { delete: deleteItem } = useCrud(entity);

  const { t: tCrud } = useTranslation('crud');

  // Entity + crud namespaces so formatValue can resolve crud:price.* etc.
  const { t } = useTranslation([entity.namespace, 'crud']);

  // Refresh handler - triggers manual refetch in useList
  const handleRefresh = async () => {
    await refreshList();
  };

  // Row click: onClick(id) if provided, else navigate to basePath/:id
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

  // Delete handler - store handles optimistic removal automatically
  const handleDelete = async (itemId: string) => {
    if (isPreview) return;
    await deleteItem(itemId);
  };

  // Generate columns from entity.listFields or entity.fields
  const fieldsToShow = entity.listFields || Object.keys(entity.fields);

  const dataColumns: TableColumn<EntityData>[] = fieldsToShow
    .map((fieldName) => {
      const fieldConfig = entity.fields[fieldName];
      if (!fieldConfig) return null;

      const label = translateFieldLabel(fieldName, fieldConfig, t);
      const fieldType = fieldConfig.type || 'text';
      const isNumeric = fieldType === 'number' || fieldType === 'range';
      const align: 'start' | 'center' | 'end' = isNumeric ? 'end' : 'start';

      return {
        key: fieldName,
        title: label,
        dataIndex: fieldName as keyof EntityData,
        sortable: !isPreview,
        filterable: !isPreview,
        align,
        render: (value: unknown, record: EntityData) =>
          formatValue(value, fieldConfig, t, {
            compact: true,
            referenceData,
            item: record as Record<string, unknown>,
          }),
      };
    })
    .filter(Boolean) as TableColumn<EntityData>[];

  // Actions column at the front (for mobile accessibility)
  const actionsColumn: TableColumn<EntityData> = {
    key: '_actions',
    title: tCrud('actions.label', { defaultValue: 'Actions' }),
    dataIndex: undefined as unknown as keyof EntityData,
    sortable: false,
    width: 120,
    align: 'center',
    render: (_: unknown, record: EntityData) => (
      <Stack direction="row" gap="tight" align="center" justify="center">
        {isPreview ? (
          <Button
            variant="outline"
            icon={Edit}
            disabled
            aria-label={tCrud('edit', { defaultValue: 'Edit' })}
          />
        ) : (
          <Button
            variant="outline"
            icon={Edit}
            render={({ children, ...renderProps }) => (
              <Link
                path={`${base}/${record.id}`}
                onClick={(e) => e.stopPropagation()}
                {...renderProps}
              >
                {children}
              </Link>
            )}
            aria-label={tCrud('edit', { defaultValue: 'Edit' })}
          />
        )}
        <ActionButton
          action={async () => {
            await handleDelete(record.id);
          }}
          confirmText={tCrud('delete.confirm', {
            defaultValue: 'Are you sure you want to delete this item?',
          })}
          confirmTitle={tCrud('delete.title', {
            defaultValue: 'Delete Item',
          })}
          loadingText={tCrud('delete.loading', {
            defaultValue: 'Deleting...',
          })}
          variant="destructive"
          icon={Trash2}
          disabled={isPreview}
          aria-label={tCrud('delete', { defaultValue: 'Delete' })}
        >
          {tCrud('delete', { defaultValue: 'Delete' })}
        </ActionButton>
      </Stack>
    ),
  };

  const columns: TableColumn<EntityData>[] = [actionsColumn, ...dataColumns];

  // Entity name for section title
  const entityName = t('name', { defaultValue: entity.name });

  // Result count
  const resultCount = filteredData.length;

  // Always show table structure - DataTable will show skeleton rows when loading
  return (
    <>
      {/* Filters Section - ALWAYS shown */}
      <Section
        title={tCrud('filters.title', {
          entity: entityName,
          defaultValue: `Browse ${entityName} - Filters`,
        })}
        collapsible
        defaultOpen={true}
        tone={tone}
      >
        <Stack>
          <Stack
            direction="row"
            gap="tight"
            align="center"
            className="dndev-w-full"
            style={{ display: 'grid', gridTemplateColumns: '1fr auto auto' }}
          >
            <Input
              placeholder={tCrud('search.placeholder', {
                defaultValue: 'Search...',
              })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
              className="dndev-w-full"
              disabled={isPreview}
            />
            <Button
              icon={RefreshCw}
              variant="outline"
              onClick={handleRefresh}
              disabled={isPreview || loading}
              display="compact"
              aria-label={tCrud('refresh', { defaultValue: 'Refresh' })}
            />
            {isPreview ? (
              <Button icon={Plus} display="compact" disabled>
                {tCrud('addNew', { defaultValue: 'Add New' })}
              </Button>
            ) : (
              <Button
                icon={Plus}
                display="compact"
                render={({ children, ...renderProps }) => (
                  <Link path={`${base}/new`} {...renderProps}>
                    {children}
                  </Link>
                )}
              >
                {tCrud('addNew', { defaultValue: 'Add New' })}
              </Button>
            )}
          </Stack>
          {!hideFilters && (
            <EntityFilters
              entity={entity}
              data={rawData}
              fieldsToFilter={entity.listFields}
            />
          )}
        </Stack>
      </Section>

      {/* Results Section */}
      <Section
        title={
          loading
            ? tCrud('results.title.fetching', {
                defaultValue: 'Fetching...',
              })
            : tCrud('results.title.count', {
                count: resultCount,
                defaultValue:
                  resultCount === 1
                    ? 'Found 1 occurrence'
                    : `Found ${resultCount} occurrences`,
              })
        }
        collapsible
        defaultOpen={true}
        tone={tone}
      >
        <DataTable
          data={filteredData}
          columns={columns}
          sortable={!isPreview}
          searchable={false}
          pagination
          loading={loading}
          onRowClick={isPreview ? undefined : (item) => handleView(item.id)}
          // Pagination labels (translated)
          showingLabel={tCrud('pagination.showing', {
            defaultValue: 'Showing {{from}} to {{to}} of {{total}} entries',
          })}
          paginationPreviousLabel={tCrud('pagination.previous', {
            defaultValue: 'Previous',
          })}
          paginationNextLabel={tCrud('pagination.next', {
            defaultValue: 'Next',
          })}
          paginationItemsPerPagePlaceholder={tCrud(
            'pagination.itemsPerPagePlaceholder',
            {
              defaultValue: 'Items per page',
            }
          )}
          // Persisted page size — always controlled via CrudStore
          pageSize={storedPageSize}
          onPageSizeChange={setStoredPageSize}
          // Server-side pagination props (when explicitly server or auto-switched to server)
          {...(!isPreview &&
            effectiveMode === 'server' && {
              currentPage,
              total: listData?.total,
              onPageChange: setCurrentPage,
            })}
          // Export functionality
          exportable={isPreview ? false : exportable}
          exportFilename={`${entity.collection}-export`}
          exportLabel={tCrud('export', { defaultValue: 'Export' })}
        />
      </Section>
    </>
  );
}
