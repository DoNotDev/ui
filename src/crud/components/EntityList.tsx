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
 * **Rows:** open-link icon (opens the record) | checkbox (bulk select, select-all
 * in the header) | fields. Checked rows can be deleted together (one `bulk({ deletes })`;
 * rows not deleted stay checked).
 *
 * **Editing (default):** list fields are edited in their cells (DataTable `editable`),
 * checked rows take one value at once; Save writes every change in one `bulk({ updates })`.
 * Partial success: rows that fail stay pending (still marked) with an error count.
 * `editable={false}`: read-only cells, a row click opens the record.
 *
 * **Nested list:** `parent={{ field, value }}` lists one parent's children; the add
 * button opens the create form with the parent prefilled.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { RefreshCw, Plus, Trash2, Search, Save, Undo2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import {
  DataTable,
  Button,
  Stack,
  ActionButton,
  Section,
  Input,
  Alert,
  Text,
} from '@donotdev/components';
import type { TableColumn, TablePendingChanges } from '@donotdev/components';
import { useTranslation } from '@donotdev/core';
import type { EntityListProps } from '@donotdev/core';
import type { InferEntityData } from '@donotdev/crud';

import { Link, useNavigate } from '../../routing';
import { useAuthSafe } from '../../utils/useAuthSafe';
import { cellEditFor } from './cellEditFor';
import { assertEntityParent, childCreatePath } from './entityParent';
import {
  isCrudModuleAvailable,
  translateFieldLabel,
  useCrud,
  useCrudFilters,
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
 * - Filters section (collapsible): closed unless filters are active (e.g. from the URL)
 * - Results section with the search / refresh / add toolbar and the DataTable
 * - Excel-like table display with formatted values
 * - Open-link icon per row, bulk select, bulk delete of the checked rows
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
  editable = true,
  parent,
  preview,
  tone,
}: EntityListProps) {
  // Safe guard: isCrudModuleAvailable is a module-level constant (immutable after load).

  if (!isCrudModuleAvailable) return null;

  const isPreview = !!preview;
  if (parent) assertEntityParent(entity, parent);

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

  // Filters panel starts closed so the table is above the fold; open when filters
  // are already applied (URL or store), so they are never hidden.
  const { filters } = useCrudFilters({ collection: entity.collection });
  const hasActiveFilters = Object.keys(filters).length > 0;

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
    ...((queryOptions || parent) && {
      queryOptions: parent
        ? {
            ...queryOptions,
            where: [
              ...(queryOptions?.where ?? []),
              { field: parent.field, operator: '==' as const, value: parent.value },
            ],
          }
        : queryOptions,
    }),
    ...((pagination === 'server' || pagination === 'auto') && {
      page: currentPage,
      pageSize: storedPageSize,
    }),
  });

  // In preview mode: use preview data, skip loading state
  const filteredData = isPreview
    ? // why: public `preview` prop is untyped records (Record<string, unknown>); rows are trusted to match the entity
      (preview as EntityData[])
    : fetchedData;
  const loading = isPreview ? false : fetchLoading;

  // useCrud -> bulk save of in-place edits, bulk delete of checked rows
  const { bulk } = useCrud(entity);

  // In-place editing: unsaved cell values, keyed by record id
  const isEditing = editable && !isPreview;
  const viewerRole = useAuthSafe('userRole');
  const [pendingChanges, setPendingChanges] = useState<TablePendingChanges>({});
  // Checked rows (bulk delete); DataTable drops rows that leave the data
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const presentIds = new Set(filteredData.map((row) => row.id));
  const checkedIds = selectedIds.filter((id) => presentIds.has(id));
  const [saving, setSaving] = useState(false);
  // Rows the last bulk save / delete did not write (they stay pending / checked)
  const [failedCount, setFailedCount] = useState(0);
  const pendingCount = Object.values(pendingChanges).reduce(
    (sum, row) => sum + Object.keys(row).length,
    0
  );

  // Partial success: saved rows leave the pending set, failed rows stay pending
  // (still marked) so nothing typed is lost; the alert gives the count to retry.
  const handleSave = async () => {
    setSaving(true);
    setFailedCount(0);
    try {
      const { failed } = await bulk({
        updates: Object.entries(pendingChanges).map(([id, patch]) => ({
          id,
          patch: patch as Partial<EntityData>,
        })),
      });
      const failedIds = new Set(failed.map((f) => f.id));
      setPendingChanges(
        Object.fromEntries(
          Object.entries(pendingChanges).filter(([id]) => failedIds.has(id))
        )
      );
      setFailedCount(failedIds.size);
    } catch {
      // Batch not attempted: every edit stays pending
      setFailedCount(Object.keys(pendingChanges).length);
    } finally {
      setSaving(false);
    }
  };

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

  // Delete the checked rows in one bulk call (partial success): deleted rows leave
  // the list, rows not deleted stay listed and checked; the alert gives the count.
  const handleDeleteSelected = async () => {
    if (isPreview) return;
    setFailedCount(0);
    const { failed } = await bulk({ deletes: checkedIds });
    const failedIds = new Set(failed.map((f) => f.id));
    setSelectedIds(checkedIds.filter((id) => failedIds.has(id)));
    setFailedCount(failedIds.size);
  };

  // Generate columns from entity.listFields or entity.fields.
  // A nested list hides its parent column: every row has the same parent.
  const fieldsToShow = (entity.listFields || Object.keys(entity.fields)).filter(
    (fieldName) => fieldName !== parent?.field
  );

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
        ...(isEditing && {
          edit: cellEditFor(fieldConfig, viewerRole, referenceData, t),
        }),
        render: (value: unknown, record: EntityData) =>
          formatValue(value, fieldConfig, t, {
            compact: true,
            referenceData,
            item: record as Record<string, unknown>,
          }),
      };
    })
    .filter(Boolean) as TableColumn<EntityData>[];

  const columns: TableColumn<EntityData>[] = dataColumns;

  // Entity name for section title
  const entityName = t('name', { defaultValue: entity.name });

  // Result count
  const resultCount = filteredData.length;

  // Always show table structure - DataTable will show skeleton rows when loading
  return (
    <>
      {!hideFilters && (
        <Section
          title={tCrud('filters.title', {
            entity: entityName,
            defaultValue: `Browse ${entityName} - Filters`,
          })}
          collapsible
          defaultOpen={hasActiveFilters}
          tone={tone}
        >
          <EntityFilters
            entity={entity}
            data={rawData}
            fieldsToFilter={fieldsToShow}
          />
        </Section>
      )}

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
              placeholder={tCrud('actions.searchPlaceholder')}
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
              aria-label={tCrud('actions.refresh')}
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
                  <Link
                    path={parent ? childCreatePath(base, parent) : `${base}/new`}
                    {...renderProps}
                  >
                    {children}
                  </Link>
                )}
              >
                {tCrud('addNew', { defaultValue: 'Add New' })}
              </Button>
            )}
          </Stack>
          {isEditing && pendingCount > 0 && (
            <Stack direction="row" gap="tight" align="center" wrap="wrap">
              <Text level="body">
                {tCrud('bulkEdit.pending', { count: pendingCount })}
              </Text>
              <Button
                icon={Save}
                display="compact"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? tCrud('form.saving') : tCrud('actions.save')}
              </Button>
              <Button
                icon={Undo2}
                variant="outline"
                display="compact"
                onClick={() => {
                  setPendingChanges({});
                  setFailedCount(0);
                }}
                disabled={saving}
              >
                {tCrud('bulkEdit.discard')}
              </Button>
            </Stack>
          )}
          {failedCount > 0 && (
            <Alert
              variant="error"
              title={tCrud('bulkEdit.failed', { count: failedCount })}
            />
          )}
          {!isPreview && checkedIds.length > 0 && (
            <Stack direction="row" gap="tight" align="center" wrap="wrap">
              <ActionButton
                action={handleDeleteSelected}
                confirmTitle={tCrud('delete.titleSelected', {
                  count: checkedIds.length,
                })}
                confirmText={tCrud('delete.confirmSelected', {
                  count: checkedIds.length,
                })}
                confirmLabel={tCrud('actions.delete')}
                cancelLabel={tCrud('actions.cancel')}
                variant="outline"
                icon={Trash2}
                display="compact"
              >
                {tCrud('bulkEdit.deleteSelected', { count: checkedIds.length })}
              </ActionButton>
            </Stack>
          )}
          <DataTable
            data={filteredData}
            columns={columns}
            sortable={!isPreview}
            searchable={false}
            pagination
            loading={loading}
            onRowClick={isPreview ? undefined : (item) => handleView(item.id)}
            selectable={!isPreview}
            getRowId={(row: EntityData) => row.id}
            onSelect={(rows: EntityData[]) =>
              setSelectedIds(rows.map((row) => row.id))
            }
            openLabel={tCrud('actions.open')}
            {...(!isPreview &&
              (onClick
                ? { onRowOpen: (row: EntityData) => onClick(row.id) }
                : { getRowHref: (row: EntityData) => `${base}/${row.id}` }))}
            {...(isEditing && {
              editable: true,
              pendingChanges,
              onPendingChange: setPendingChanges,
              editLabels: {
                selected: tCrud('bulkEdit.selected'),
                field: tCrud('bulkEdit.field'),
                value: tCrud('bulkEdit.value'),
                apply: tCrud('bulkEdit.apply'),
              },
            })}
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
        </Stack>
      </Section>
    </>
  );
}
