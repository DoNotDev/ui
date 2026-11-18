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
 * `editable={false}`: read-only cells (no Add, selection or delete), a row click opens the record.
 *
 * **Nested list:** `parent={{ field, value }}` lists one parent's children; the add
 * button opens the create form with the parent prefilled.
 *
 * **Joined to the parent's form:** with `parent`, `editable` (default) and an
 * edit form open on that record, the list is a display of `useChildRows`: no own Save, deletes wait for
 * the form's Save, pending counts + Discard; add opens a picker (link table:
 * one reference besides the parent's) or adds a blank row. `parent.value: null`
 * (parent not created yet) only shows "Create the draft before adding …".
 *
 * **Overrides:** `extraColumns` (app columns from the row with unsaved edits
 * applied), `actions` (app toolbar content), `extend` (1:1 extensions: their
 * columns, edited and saved with the rows; the list is then a display of
 * `useChildRows`).
 *
 * **Read-only** (`editable={false}`): no Add, no row selection, no delete.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Search, Undo2 } from 'lucide-react';
import { Suspense, lazy, useCallback, useState } from 'react';
import type { ReactNode } from 'react';

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
import {
  describeEntity,
  getEntityByCollection,
  useTranslation,
} from '@donotdev/core';
import type {
  AnyEntity,
  EntityListExtraColumn,
  EntityListProps,
} from '@donotdev/core';
import type { InferEntityData } from '@donotdev/crud';

import { Link, useNavigate } from '../../routing';
import { useAuthSafe } from '../../utils/useAuthSafe';
import { cellEditFor } from './cellEditFor';
import { assertEntityParent, childCreatePath } from './entityParent';
import type { SavedEntityParent } from './entityParent';
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
  useChildRows,
  useJoinedForm,
  applyFilters,
  applySearch,
} from '../crudImports';

export type { EntityListProps };

/** Link table picker: loaded on first use. */
const ChildRowsPicker = lazy(() => import('./ChildRowsPicker'));

type Translate = (key: string, options?: Record<string, unknown>) => string;
type ListRow = Record<string, unknown> & { id: string };

/**
 * Toolbar grid, by the number of cells after the first (search): refresh, add,
 * app actions. Module-level: no style object per render.
 */
const TOOLBAR_STYLES = [0, 1, 2, 3, 4].map((after) => ({
  display: 'grid',
  gridTemplateColumns: ['1fr', ...Array<string>(after).fill('auto')].join(' '),
}));

/**
 * Columns of the entity's list fields (the parent column hidden), formatted,
 * edited in their cells when `editing`.
 */
function entityColumns<T extends ListRow>(
  entity: AnyEntity,
  fieldsToShow: string[],
  options: {
    t: Translate;
    viewerRole: string;
    referenceData: Record<string, Record<string, string>>;
    editing: boolean;
    interactive: boolean;
  }
): TableColumn<T>[] {
  const { t, viewerRole, referenceData, editing, interactive } = options;
  return fieldsToShow
    .map((fieldName) => {
      const fieldConfig = entity.fields[fieldName];
      if (!fieldConfig) return null;

      const label = translateFieldLabel(fieldName, fieldConfig, t);
      const fieldType = fieldConfig.type;
      const isNumeric = fieldType === 'number' || fieldType === 'range';
      const align: 'start' | 'center' | 'end' = isNumeric ? 'end' : 'start';

      return {
        key: fieldName,
        title: label,
        dataIndex: fieldName as keyof T,
        sortable: interactive,
        filterable: interactive,
        align,
        ...(editing && {
          edit: cellEditFor(entity, fieldName, viewerRole, referenceData, t),
        }),
        render: (value: unknown, record: T) =>
          formatValue(value, fieldConfig, t, {
            compact: true,
            referenceData,
            item: record as Record<string, unknown>,
          }),
      };
    })
    .filter(Boolean) as TableColumn<T>[];
}

/** App columns (`extraColumns`), rendered from the row with its unsaved edits applied. */
function appColumns<T extends ListRow>(
  extraColumns: EntityListExtraColumn[] | undefined,
  edited: (row: T) => ListRow
): TableColumn<T>[] {
  return (extraColumns ?? []).map((column) => ({
    key: column.key,
    title: column.title,
    align: column.align ?? 'start',
    render: (_value: unknown, record: T) => column.render(edited(record)),
  }));
}

/** App toolbar content (`actions`), one toolbar cell. */
function ToolbarActions({ actions }: { actions: ReactNode }) {
  return (
    <Stack direction="row" gap="tight" align="center">
      {actions}
    </Stack>
  );
}

/**
 * Entity List Component - Table view for admin/internal operations
 *
 * Features:
 * - Filters section (collapsible): closed unless filters are active (e.g. from the URL)
 * - Results section with the search / refresh / add toolbar and the DataTable
 * - Excel-like table display with formatted values
 * - Open-link icon per row, bulk select, bulk delete of the checked rows
 * - Auto-routing when handlers not provided
 * - With `parent`, `editable` (default) and an edit form open on that record:
 *   joined to the form (`useChildRows`), saved by its Save
 */
export function EntityList(props: EntityListProps) {
  // Safe guard: isCrudModuleAvailable is a module-level constant (immutable after load).

  if (!isCrudModuleAvailable) return null;

  const { entity, parent, preview, tone, editable = true } = props;
  if (parent) assertEntityParent(entity, parent);

  // An editable list of child rows joins the edit form open on the parent record
  // (latest opened wins). Read-only lists (`editable={false}`) never join.
  const joinedForm = useJoinedForm(entity, parent);

  if (parent && parent.value === null) {
    return <ChildRowsCreateFirst entity={entity} tone={tone} />;
  }
  const savedParent: SavedEntityParent | undefined =
    parent && parent.value !== null
      ? { field: parent.field, value: parent.value }
      : undefined;
  // With 1:1 extensions, or joined to the parent's form: a display of useChildRows.
  if (!preview && (props.extend || (joinedForm && savedParent && editable))) {
    return <RowsEntityList {...props} parent={savedParent} />;
  }
  return <StandaloneEntityList {...props} parent={savedParent} />;
}

/** `parent.value: null`: the parent is not created yet, rows cannot be added. */
function ChildRowsCreateFirst({
  entity,
  tone,
}: Pick<EntityListProps, 'entity' | 'tone'>) {
  const { t } = useTranslation([entity.namespace, 'crud']);
  return (
    <Section tone={tone}>
      <Text level="body">
        {t('crud:childRows.createFirst', {
          entity: t('name', { defaultValue: entity.name }),
        })}
      </Text>
    </Section>
  );
}

/** Props of the list once its parent (if any) is created. */
type ListProps = Omit<EntityListProps, 'parent'> & {
  parent?: SavedEntityParent;
};

/** No form open on the parent: own Save, immediate delete, add opens the create page. */
function StandaloneEntityList({
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
  extraColumns,
  actions,
}: ListProps) {
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

  const dataColumns = entityColumns<EntityData>(entity, fieldsToShow, {
    t,
    viewerRole,
    referenceData,
    editing: isEditing,
    interactive: !isPreview,
  });

  const columns: TableColumn<EntityData>[] = [
    ...dataColumns,
    ...appColumns<EntityData>(extraColumns, (row) => ({
      ...row,
      ...pendingChanges[row.id],
    })),
  ];

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
          })}
          collapsible
          defaultOpen={hasActiveFilters}
          tone={tone}
        >
          <EntityFilters
            entity={entity}
            data={rawData}
            fieldsToFilter={fieldsToShow}
            viewerRole={viewerRole}
          />
        </Section>
      )}

      {/* Results Section */}
      <Section
        title={
          loading
            ? tCrud('results.title.fetching')
            : tCrud('results.title.count', {
                count: resultCount,
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
            style={TOOLBAR_STYLES[1 + (editable ? 1 : 0) + (actions ? 1 : 0)]}
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
              intent="reload"
              variant="outline"
              onClick={handleRefresh}
              disabled={isPreview || loading}
              display="compact"
              aria-label={tCrud('actions.refresh')}
            />
            {/* Read-only list (editable={false}): no Add */}
            {!editable ? null : isPreview ? (
              <Button intent="add" display="compact" disabled>
                {tCrud('addNew')}
              </Button>
            ) : (
              <Button
                intent="add"
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
                {tCrud('addNew')}
              </Button>
            )}
            {actions && <ToolbarActions actions={actions} />}
          </Stack>
          {isEditing && pendingCount > 0 && (
            <Stack direction="row" gap="tight" align="center" wrap="wrap">
              <Text level="body">
                {tCrud('bulkEdit.pending', { count: pendingCount })}
              </Text>
              <Button
                intent="save"
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
          {!isPreview && editable && checkedIds.length > 0 && (
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
                intent="delete"
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
            // Read-only list (editable={false}): no selection, no delete
            selectable={!isPreview && editable}
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
            showingLabel={tCrud('pagination.showing')}
            paginationPreviousLabel={tCrud('pagination.previous')}
            paginationNextLabel={tCrud('pagination.next')}
            paginationItemsPerPagePlaceholder={tCrud(
              'pagination.itemsPerPagePlaceholder'
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
            exportLabel={tCrud('export')}
          />
        </Stack>
      </Section>
    </>
  );
}

/**
 * The other reference field of a link table (the child has exactly one
 * reference field besides the parent's: descriptor `value.kind === 'ref'`, any
 * field type with `validation.reference`), or null.
 */
function linkFieldOf(entity: AnyEntity, parentField: string): string | null {
  const others = Object.entries(describeEntity(entity).fields).filter(
    ([name, { value }]) =>
      name !== parentField && value.kind === 'ref' && value.ref !== undefined
  );
  return others.length === 1 ? others[0]![0] : null;
}

/**
 * The list as a display of `useChildRows`:
 * - **joined** (an edit form open on the parent record, `editable`): edits live
 *   in the form's draft and its Save writes them; no own Save, deletes wait for
 *   that Save, pending counts + Discard; all lines shown (no filters section,
 *   search, export or pagination); Add opens the picker (link table) or adds a
 *   blank row, never navigates;
 * - **standalone with `extend`**: filters, search, pagination, export, own Save
 *   (rows and extensions in one write; deletes wait for it), Add opens the
 *   create page.
 * `editable={false}`: read-only (no Add, no selection, no delete).
 */
function RowsEntityList({
  entity,
  basePath,
  onClick,
  hideFilters = false,
  pageSize: pageSizeProp,
  exportable = true,
  editable = true,
  parent,
  tone,
  extraColumns,
  actions,
  extend,
}: ListProps) {
  const navigate = useNavigate();
  const base = basePath ?? `/${entity.collection}`;
  const viewerRole = useAuthSafe('userRole');
  const rows = useChildRows(entity, parent, {
    viewerRole,
    ...(extend && { extend }),
  });
  const joined = rows.joined && editable;
  const referenceData = useReferenceResolver(entity);
  const { pageSize, setPageSize } = useCrudPageSize({
    collection: entity.collection,
    ...(pageSizeProp != null && { defaultPageSize: pageSizeProp }),
  });
  const [searchQuery, setSearchQuery] = useState('');
  const { filters } = useCrudFilters({ collection: entity.collection });
  const hasActiveFilters = Object.keys(filters).length > 0;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Why the last own Save did not write (invalid rows count, or the write error). */
  const [saveError, setSaveError] = useState<string | null>(null);
  const { t: tCrud } = useTranslation('crud');
  const { t } = useTranslation([entity.namespace, 'crud']);

  // Link table (joined): add picks records of the other side (already linked excluded).
  const linkField = parent && joined ? linkFieldOf(entity, parent.field) : null;
  const linkCollection = linkField
    ? entity.fields[linkField]?.validation?.reference
    : undefined;
  const linkEntity =
    typeof linkCollection === 'string'
      ? getEntityByCollection(linkCollection)
      : undefined;
  if (linkCollection && !linkEntity) {
    throw new Error(
      `EntityList: no entity defines collection "${String(linkCollection)}" (the other side of link table "${entity.collection}"). Define it with defineEntity().`
    );
  }
  const linkedIds = new Set(
    linkField
      ? rows.items.flatMap((row) => {
          const linked = row[linkField];
          return typeof linked === 'string' ? [linked] : [];
        })
      : []
  );

  // Joined: every line shown. Standalone: filters and search on the rows as
  // edited. The table shows them without their cell changes (overlaid as pending).
  const baseById = new Map(rows.base.map((row) => [row.id, row]));
  const addedIds = new Set(rows.edits.added.map((row) => row.id));
  const shownIds = joined
    ? null
    : new Set(
        applySearch(applyFilters(rows.items, filters, entity), searchQuery, entity).map(
          (row) => row.id
        )
      );
  const data = shownIds ? rows.base.filter((row) => shownIds.has(row.id)) : rows.base;
  const checkedIds = selectedIds.filter((id) => baseById.has(id));
  const isEditing =
    editable &&
    (rows.access.update || rows.extensionFields.some((field) => field.editable));

  // Table edits (cells, paste, bulk apply, undo) → row values.
  const applyPending = (next: TablePendingChanges) => {
    const previous = rows.edits.changes;
    for (const id of new Set([...Object.keys(previous), ...Object.keys(next)])) {
      const row = baseById.get(id);
      if (!row) continue;
      const before = previous[id] ?? {};
      const after = next[id] ?? {};
      const patch: Record<string, unknown> = {};
      for (const field of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (field in after) {
          if (!(field in before) || before[field] !== after[field]) {
            patch[field] = after[field];
          }
        } else {
          patch[field] = row[field];
        }
      }
      if (Object.keys(patch).length > 0) rows.update(id, patch);
    }
  };

  const open = (id: string) => {
    if (addedIds.has(id)) return; // not saved yet: no record to open
    if (onClick) onClick(id);
    else navigate(`${base}/${id}`);
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await rows.save();
    } catch (error) {
      // Not written: every edit stays pending. Invalid rows: the count (cells show each field).
      setSaveError(error instanceof Error ? error.message : tCrud('form.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const fieldsToShow = (entity.listFields || Object.keys(entity.fields)).filter(
    (fieldName) => fieldName !== parent?.field
  );
  // Extension columns: each extension entity's list fields the viewer may see, prefixed.
  const extensionColumns: TableColumn<ListRow>[] = rows.extensionFields
    .filter((field) => {
      const ext = field.scope ? extend?.[field.scope] : undefined;
      const unprefixed = field.name.slice((field.scope ?? '').length + 1);
      return !ext?.entity.listFields || ext.entity.listFields.includes(unprefixed);
    })
    .map((field) => {
      const { scope } = field;
      const ext = scope ? extend?.[scope] : undefined;
      if (!scope || !ext) {
        throw new Error(`EntityList: extension field "${field.name}" has no extension "${scope}".`);
      }
      const unprefixed = field.name.slice(scope.length + 1);
      const isNumeric = field.config.type === 'number' || field.config.type === 'range';
      return {
        key: field.name,
        title: translateFieldLabel(field.name, field.config, t),
        dataIndex: field.name,
        sortable: true,
        filterable: !joined,
        align: isNumeric ? ('end' as const) : ('start' as const),
        ...(isEditing &&
          field.editable && {
            edit: cellEditFor(ext.entity, unprefixed, viewerRole, referenceData, t),
          }),
        render: (value: unknown, record: ListRow) =>
          formatValue(value, field.config, t, {
            compact: true,
            referenceData,
            item: record,
          }),
      };
    });
  const columns: TableColumn<ListRow>[] = [
    ...entityColumns<ListRow>(entity, fieldsToShow, {
      t,
      viewerRole,
      referenceData,
      editing: isEditing && rows.access.update,
      interactive: true,
    }),
    ...extensionColumns,
    ...appColumns<ListRow>(extraColumns, (row) => ({
      ...row,
      ...rows.edits.changes[row.id],
    })),
  ];
  const entityName = t('name', { defaultValue: entity.name });
  const showAdd = editable && rows.access.create;
  const toolbarCells = 1 + (showAdd ? 1 : 0) + (actions ? 1 : 0);

  return (
    <>
      {!joined && !hideFilters && (
        <Section
          title={tCrud('filters.title', { entity: entityName })}
          collapsible
          defaultOpen={hasActiveFilters}
          tone={tone}
        >
          <EntityFilters
            entity={entity}
            data={rows.items}
            fieldsToFilter={fieldsToShow}
            viewerRole={viewerRole}
          />
        </Section>
      )}

      <Section
        title={
          rows.loading
            ? tCrud('results.title.fetching')
            : tCrud('results.title.count', { count: data.length })
        }
        tone={tone}
      >
        <Stack>
          <Stack
            direction="row"
            gap="tight"
            align="center"
            className="dndev-w-full"
            style={TOOLBAR_STYLES[joined ? toolbarCells - 1 : toolbarCells]}
          >
            {!joined && (
              <Input
                placeholder={tCrud('actions.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={Search}
                className="dndev-w-full"
              />
            )}
            <Button
              intent="reload"
              variant="outline"
              onClick={() => void rows.refresh()}
              disabled={rows.loading}
              display="compact"
              aria-label={tCrud('actions.refresh')}
            />
            {showAdd &&
              (joined ? (
                // Joined: rows are added in place (picker or blank row), never a navigation.
                <Button
                  type="button"
                  intent="add"
                  display="compact"
                  onClick={() => (linkField ? setPicking(true) : rows.add([{}]))}
                  disabled={rows.loading}
                >
                  {tCrud('addNew')}
                </Button>
              ) : (
                <Button
                  intent="add"
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
                  {tCrud('addNew')}
                </Button>
              ))}
            {actions && <ToolbarActions actions={actions} />}
          </Stack>
          {rows.pendingCount > 0 && (
            <Stack direction="row" gap="tight" align="center" wrap="wrap">
              <Text level="body">
                {tCrud('bulkEdit.pending', { count: rows.pendingCount })}
              </Text>
              {!joined && (
                <Button
                  type="button"
                  intent="save"
                  display="compact"
                  onClick={() => void save()}
                  disabled={saving}
                >
                  {saving ? tCrud('form.saving') : tCrud('actions.save')}
                </Button>
              )}
              <Button
                type="button"
                icon={Undo2}
                variant="outline"
                display="compact"
                onClick={() => {
                  rows.discard();
                  setSaveError(null);
                }}
                disabled={saving}
              >
                {tCrud('bulkEdit.discard')}
              </Button>
            </Stack>
          )}
          {saveError && <Alert variant="error" title={saveError} />}
          {editable &&
            checkedIds.length > 0 &&
            (rows.access.delete || checkedIds.every((id) => addedIds.has(id))) && (
              <Stack direction="row" gap="tight" align="center" wrap="wrap">
                <Button
                  type="button"
                  variant="outline"
                  intent="delete"
                  display="compact"
                  onClick={() => {
                    rows.remove(checkedIds);
                    setSelectedIds([]);
                  }}
                >
                  {tCrud('bulkEdit.deleteSelected', { count: checkedIds.length })}
                </Button>
              </Stack>
            )}
          <DataTable
            data={data}
            columns={columns}
            sortable
            searchable={false}
            pagination={!joined}
            loading={rows.loading}
            onRowClick={(row) => open(row.id)}
            selectable={editable}
            getRowId={(row: ListRow) => row.id}
            onSelect={(selected: ListRow[]) =>
              setSelectedIds(selected.map((row) => row.id))
            }
            openLabel={tCrud('actions.open')}
            onRowOpen={(row: ListRow) => open(row.id)}
            // Fields breaking the entity's rules, checked on every change
            cellErrors={rows.errors}
            {...(isEditing && {
              editable: true,
              pendingChanges: rows.edits.changes,
              onPendingChange: applyPending,
              editLabels: {
                selected: tCrud('bulkEdit.selected'),
                field: tCrud('bulkEdit.field'),
                value: tCrud('bulkEdit.value'),
                apply: tCrud('bulkEdit.apply'),
              },
            })}
            showingLabel={tCrud('pagination.showing')}
            paginationPreviousLabel={tCrud('pagination.previous')}
            paginationNextLabel={tCrud('pagination.next')}
            paginationItemsPerPagePlaceholder={tCrud(
              'pagination.itemsPerPagePlaceholder'
            )}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            exportable={!joined && exportable}
            exportFilename={`${entity.collection}-export`}
            exportLabel={tCrud('export')}
          />
        </Stack>
      </Section>
      {picking && linkField && linkEntity && (
        <Suspense fallback={null}>
          <ChildRowsPicker
            entity={linkEntity}
            viewerRole={viewerRole}
            excludedIds={linkedIds}
            onPick={(ids) =>
              rows.add(ids.map((id) => ({ [linkField]: id })))
            }
            onClose={() => setPicking(false)}
          />
        </Suspense>
      )}
    </>
  );
}
