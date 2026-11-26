'use client';
// packages/ui/src/crud/components/EntityList.tsx

/**
 * @fileoverview Entity List Component
 * @description Table view for admin/internal CRUD operations.
 * Layout: one `<Section>` with an admin header (title = the count wording, "64
 * products"; an empty collection: "No products yet"; Add at the end), one toolbar row
 * ([search][Filters] … [Export][Refresh][app `actions`]), the DataTable. The
 * Filters button (badge: active filters) opens the entity filters in a side sheet.
 * Checked rows ("N selected · bulk edit · Delete · ✕") and unsaved edits ("N unsaved
 * changes · Discard · Save") show in the bottom ActionBar: nothing above the table moves.
 * Empty states: an empty collection ("No products yet" + Add) vs no row matching the
 * search / filters ("No results for “x”" + Clear); a failed read shows the shared load
 * error (`CrudLoadError`: translated title and reason, Retry; the raw error in the console).
 *
 * **Columns** (generated from the field types; hand-built DataTables set their own):
 * image 56 px, boolean 72, date 112, timestamp 180, select 120, reference 180, rating
 * 104, numbers end-aligned with tabular digits, long text on 2 lines; the first `text` field is the
 * row name (min 240 px, flexible, pinned at the inline start). Under 768 px rows stack
 * (CSS only); with `listCardFields`, only those fields (and the name) are shown there.
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
 * Partial success: rows that fail stay pending; their cells are in error (`cellErrors`:
 * the failure's field when the backend names one, else every cell the row sent;
 * message from the failure's i18n key, else `crud:form.saveFailed`), listed in the
 * DataTable's "N errors" button, each until its value changes or the next save.
 * `editable={false}`: read-only cells (no Add, selection or delete), a row click opens the record.
 *
 * **Nested list:** `parent={{ field, value }}` lists one parent's children; the add
 * button opens the create form with the parent prefilled.
 *
 * **Joined to the parent's form:** with `parent`, `editable` (default) and an
 * edit form open on that record, the list is a display of `useChildRows`: no own Save, deletes wait for
 * the form's Save, pending counts + Discard (in the toolbar row: the form's own footer
 * holds the Save, a bottom bar would cover it); add opens a picker (link table:
 * one reference besides the parent's) or adds a blank row. `parent.value: null`
 * (parent not created yet) only shows "Create the draft before adding …".
 *
 * **Overrides:** `extraColumns` (app columns from the row with unsaved edits
 * applied), `actions` (app toolbar content), `extend` (1:1 extensions: their
 * columns, edited and saved with the rows; the list is then a display of
 * `useChildRows`).
 *
 * **Read-only** (`editable={false}`): no Add, no row selection, no delete.
 * **No delete** (`deletable={false}`): editing and row selection (bulk edit) stay, the
 * selection bar has no Delete.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { ListFilter, Search, Undo2 } from 'lucide-react';
import { Suspense, lazy, useCallback, useState } from 'react';
import type { ReactNode } from 'react';

import {
  DataTable,
  Button,
  Stack,
  ActionButton,
  Section,
  Input,
  Sheet,
  Text,
} from '@donotdev/components';
import type { TableColumn, TablePendingChanges } from '@donotdev/components';
import {
  describeEntity,
  effectivePrice,
  fieldColumnTitle,
  getEntityByCollection,
  useTranslation,
} from '@donotdev/core';
import type {
  AnyEntity,
  BulkFailure,
  EntityField,
  EntityListExtraColumn,
  EntityListProps,
} from '@donotdev/core';
import type { InferEntityData } from '@donotdev/crud';

import { Link, useNavigate } from '../../routing';
import { useAuthSafe } from '../../utils/useAuthSafe';
import { cellEditFor } from './cellEditFor';
import { CrudLoadError } from './CrudLoadError';
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

/** Width of a column by field type (generated lists; hand-built DataTables set their own). */
const FIELD_TYPE_WIDTHS: Partial<Record<string, number>> = {
  image: 56,
  images: 56,
  avatar: 56,
  boolean: 72,
  checkbox: 72,
  switch: 72,
  date: 112,
  timestamp: 180,
  'datetime-local': 180,
  select: 120,
  radio: 120,
  combobox: 120,
  badge: 120,
  reference: 180,
  rating: 104,
};

/** Numeric field types: end-aligned, tabular digits (DataTable `align: 'end'`). */
const NUMERIC_FIELD_TYPES = new Set([
  'number',
  'range',
  'currency',
  'price',
  'rating',
  'year',
]);

/** Long-text field types: two lines per cell before "…". */
const LONG_TEXT_FIELD_TYPES = new Set(['textarea', 'richtext']);

/** Minimum width of the record name column (the first text field), which takes the free space. */
const NAME_COLUMN_MIN_WIDTH = 240;

/**
 * Column preset of a field (P4): width by type, numbers end-aligned, long text
 * on two lines; the record name column (first text field) wide, flexible and
 * pinned at the inline start; on phones (< 768 px) only the entity's
 * `listCardFields` (and the name) are shown in each stacked row.
 */
function fieldColumnPreset(
  fieldName: string,
  fieldConfig: EntityField,
  layout: { nameField: string | undefined; phoneFields: Set<string> | null }
): Pick<
  TableColumn<ListRow>,
  'width' | 'minWidth' | 'align' | 'lines' | 'sticky' | 'hideOnPhone'
> {
  const type = fieldConfig.type;
  const isName = fieldName === layout.nameField;
  const width = FIELD_TYPE_WIDTHS[type];
  return {
    align: NUMERIC_FIELD_TYPES.has(type) ? 'end' : 'start',
    ...(width !== undefined && { width }),
    ...(LONG_TEXT_FIELD_TYPES.has(type) && { lines: 2 as const }),
    ...(isName && { minWidth: NAME_COLUMN_MIN_WIDTH, sticky: true }),
    ...(layout.phoneFields &&
      !isName &&
      !layout.phoneFields.has(fieldName) && { hideOnPhone: true }),
  };
}

/**
 * Fields a stacked row shows on phones: the entity's `listCardFields` (list or
 * slot layout), or null (every column) when it declares none.
 */
function phoneFieldsOf(entity: AnyEntity): Set<string> | null {
  const cards = entity.listCardFields;
  if (!cards) return null;
  if (Array.isArray(cards)) return new Set(cards);
  return new Set([
    ...(cards.title ?? []),
    ...(cards.subtitle ?? []),
    ...(cards.content ?? []),
    ...(cards.footer ?? []),
  ]);
}

/** The record name column: the first `text` field shown. */
function nameFieldOf(entity: AnyEntity, fieldsToShow: string[]): string | undefined {
  return fieldsToShow.find((name) => entity.fields[name]?.type === 'text');
}

/**
 * Columns of the entity's list fields (the parent column hidden), formatted,
 * sized by field type, edited in their cells when `editing`.
 */
function entityColumns<T extends ListRow>(
  entity: AnyEntity,
  fieldsToShow: string[],
  options: {
    t: Translate;
    /** UI language: cell editor option order */
    language: string;
    viewerRole: string;
    referenceData: Record<string, Record<string, string>>;
    editing: boolean;
    interactive: boolean;
  }
): TableColumn<T>[] {
  const { t, language, viewerRole, referenceData, editing, interactive } =
    options;
  const layout = {
    nameField: nameFieldOf(entity, fieldsToShow),
    phoneFields: phoneFieldsOf(entity),
  };
  return fieldsToShow
    .map((fieldName) => {
      const fieldConfig = entity.fields[fieldName];
      if (!fieldConfig) return null;

      const label = translateFieldLabel(fieldName, fieldConfig, t);
      const fieldType = fieldConfig.type;

      return {
        key: fieldName,
        // A price column says "VAT incl." once, in its header (cells: the amount)
        title: fieldColumnTitle(label, fieldConfig, t),
        dataIndex: fieldName as keyof T,
        filterable: interactive,
        ...fieldColumnPreset(fieldName, fieldConfig, layout),
        ...(editing && {
          edit: cellEditFor(
            entity,
            fieldName,
            viewerRole,
            referenceData,
            t,
            language
          ),
        }),
        // A price sorts on the price it shows (discount applied), not its text
        ...(fieldType === 'price' && {
          sortValue: (row: T) => effectivePrice(row[fieldName]),
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

/** A cell a bulk save did not write: the value it sent and why (translated). */
interface FailedCell {
  sent: unknown;
  message: string;
}

/** Cells a bulk save did not write, by row id and field. */
type FailedCells = Record<string, Record<string, FailedCell>>;

/**
 * Cells of a partly failed bulk save. Per failure, the row it sent (`sentRow`: its
 * id and the values written, `null` when the failure has no row, e.g. a delete):
 * the failure's `field` when the backend names one and the row sent it, else every
 * field the row sent. `message(failure, field)` translates it (the backend's own
 * text is never shown).
 */
function failedCellsOf(
  failed: readonly BulkFailure[],
  sentRow: (failure: BulkFailure) => { id: string; values: Record<string, unknown> } | null,
  message: (failure: BulkFailure, field: string) => string
): FailedCells {
  const cells: FailedCells = {};
  for (const failure of failed) {
    const row = sentRow(failure);
    if (!row) continue;
    const fields =
      failure.field !== undefined && failure.field in row.values
        ? [failure.field]
        : Object.keys(row.values);
    for (const field of fields) {
      (cells[row.id] ??= {})[field] = {
        sent: row.values[field],
        message: message(failure, field),
      };
    }
  }
  return cells;
}

/**
 * Cell message of a save failure: its i18n key (`crud:childRows.invalidValue`,
 * `{{field}}` = the field label) when the backend maps the rule, else
 * `crud:form.saveFailed`. `t`: entity + `crud` namespaces.
 */
function saveFailureMessage(
  entity: AnyEntity,
  t: Translate
): (failure: BulkFailure, field: string) => string {
  return (failure, field) =>
    failure.i18nKey
      ? t(failure.i18nKey, {
          field: translateFieldLabel(field, entity.fields[field], t),
        })
      : t('crud:form.saveFailed');
}

/**
 * DataTable `cellErrors` of the failed cells whose value is still the one sent: an
 * edited (or reverted) cell leaves the error list at once.
 */
function failedCellErrors(
  cells: FailedCells,
  valueOf: (id: string, field: string) => unknown
): Record<string, Record<string, string>> {
  const errors: Record<string, Record<string, string>> = {};
  for (const [id, fields] of Object.entries(cells)) {
    for (const [field, { sent, message }] of Object.entries(fields)) {
      if (Object.is(valueOf(id, field), sent)) (errors[id] ??= {})[field] = message;
    }
  }
  return errors;
}

/** App toolbar content (`actions`), at the end of the toolbar. */
function ToolbarActions({ actions }: { actions: ReactNode }) {
  return (
    <Stack direction="row" gap="tight" align="center">
      {actions}
    </Stack>
  );
}

/** What the list header says: its read state and the rows it counts. */
interface ListHeadingState {
  loading: boolean;
  failed: boolean;
  /** Rows of the read (client mode: after search / filters; server mode: the query total). */
  count: number;
}

/**
 * Words of the list header and states, from the entity's `name` / `namePlural`
 * translations. `heading` is the Section title: the count wording ("64 products",
 * "0 products") or "Loading..."; none when the read failed (the load error box's own
 * title says it once, as on the detail page). No separate plural title: a page
 * that titles itself ("Products") never shows the name twice. `empty` is the empty
 * row's text ("No products yet"), said there only. Each crud locale picks the forms
 * it needs (`name`, `names`, lowercase `nameLower`, `namesLower`).
 */
function useListWords(entity: AnyEntity) {
  // `language`, not `i18n.language`: set during the server render and hydration pass too
  const { t, language } = useTranslation([entity.namespace, 'crud']);
  const { t: tCrud } = useTranslation('crud');
  const name = t('name', { defaultValue: entity.name });
  const names = t('namePlural', { defaultValue: name });
  const words = {
    name,
    names,
    nameLower: name.toLocaleLowerCase(language),
    namesLower: names.toLocaleLowerCase(language),
  };
  return {
    heading: ({ loading, failed, count }: ListHeadingState): string | undefined =>
      loading
        ? tCrud('messages.loading')
        : failed
          ? undefined
          : tCrud('list.count', { count, ...words }),
    empty: tCrud('list.empty', words),
    /** The entity's plural name (the load error's subject) */
    names,
  };
}

/**
 * The list's Section: an admin header (title = the count wording or the read
 * state, none on a failed read; plain heading style, the Add button at the end),
 * then the table.
 */
function ListSection({
  title,
  add,
  tone,
  children,
}: {
  title: string | undefined;
  add: ReactNode;
  tone: EntityListProps['tone'];
  children: ReactNode;
}) {
  return (
    <Section
      title={title}
      titleVariant="heading"
      textAlign="start"
      actions={add}
      tone={tone}
    >
      {children}
    </Section>
  );
}

/**
 * "Filters" toolbar button (badge: active filters count) opening the entity
 * filters in a side sheet: nothing above the table moves.
 */
function FiltersButton({
  entity,
  data,
  fieldsToFilter,
  viewerRole,
  activeCount,
  disabled,
}: {
  entity: AnyEntity;
  data: ListRow[];
  fieldsToFilter: string[];
  viewerRole: string;
  activeCount: number;
  disabled?: boolean;
}) {
  const { t: tCrud } = useTranslation('crud');
  const label = tCrud('filters.button');
  return (
    <Sheet
      size="narrow"
      title={tCrud('filters.title')}
      closeLabel={tCrud('actions.close')}
      trigger={
        <Button
          variant="outline"
          icon={ListFilter}
          badge={activeCount}
          disabled={disabled}
          aria-label={
            activeCount > 0
              ? tCrud('filters.buttonActive', { count: activeCount })
              : label
          }
        >
          {label}
        </Button>
      }
    >
      <EntityFilters
        entity={entity}
        data={data}
        fieldsToFilter={fieldsToFilter}
        viewerRole={viewerRole}
        // One column; the sheet body scrolls (the sidebar variant's own
        // ScrollArea would clip the filters below the sheet's height)
        cols={1}
      />
    </Sheet>
  );
}

/**
 * The table's empty row: an empty collection ("No products yet" + Add), or no
 * row matching the search / filters ("No results for “x”" + Clear).
 */
function ListEmptyState({
  filtered,
  searchQuery,
  emptyLabel,
  add,
  onClear,
}: {
  filtered: boolean;
  searchQuery: string;
  emptyLabel: string;
  add: ReactNode;
  onClear: () => void;
}) {
  const { t: tCrud } = useTranslation('crud');
  return (
    <Stack align="center" gap="tight">
      <Text as="span" variant="muted">
        {!filtered
          ? emptyLabel
          : searchQuery !== ''
            ? tCrud('list.noResultsFor', { query: searchQuery })
            : tCrud('filters.noResults')}
      </Text>
      {filtered ? (
        <Button variant="link" onClick={onClear}>
          {tCrud('actions.clear')}
        </Button>
      ) : (
        add
      )}
    </Stack>
  );
}

/**
 * Pending edits in the bottom bar: "N unsaved changes", Discard, Save; why the last
 * write failed when no cell carries it (a delete, a write not attempted). Cells a save
 * rejected are in the DataTable's own "N errors" list, beside this.
 */
function PendingBar({
  count,
  saving,
  failure,
  onSave,
  onDiscard,
}: {
  count: number;
  saving: boolean;
  failure: string | null;
  /** Absent: the parent form's Save writes the rows (joined list). */
  onSave?: () => void;
  onDiscard: () => void;
}) {
  const { t: tCrud } = useTranslation('crud');
  return (
    <>
      {failure && (
        <Text as="span" variant="destructive" role="alert">
          {failure}
        </Text>
      )}
      {count > 0 && (
        <>
          <Text as="span" weight="medium">
            {tCrud('bulkEdit.pending', { count })}
          </Text>
          <Button
            type="button"
            icon={Undo2}
            variant="outline"
            display="full"
            onClick={onDiscard}
            disabled={saving}
          >
            {tCrud('bulkEdit.discard')}
          </Button>
          {onSave && (
            <Button
              type="button"
              intent="save"
              variant="primary"
              display="full"
              onClick={onSave}
              loading={saving}
            >
              {saving ? tCrud('form.saving') : tCrud('actions.save')}
            </Button>
          )}
        </>
      )}
    </>
  );
}

/**
 * Entity List Component - Table view for admin/internal operations
 *
 * Features:
 * - Admin Section header: the count ("64 products") or state as title, Add at the end
 * - One toolbar row: search, Filters (side sheet, active-count badge), Export, Refresh
 * - Excel-like table display with formatted values, columns sized by field type
 * - Selection and unsaved edits in the bottom ActionBar; empty / no-result / error states
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
  deletable = true,
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

  // Filters open in a side sheet from the toolbar; the button counts the active ones.
  const { filters, setFilters } = useCrudFilters({
    collection: entity.collection,
  });
  const activeFilterCount = Object.keys(filters).length;

  // useCrudList now handles client-side filter + search + sort via `processed`
  // effectiveMode tells us if auto-mode switched to server (for DataTable props)
  const {
    data: listData,
    items: rawData,
    processed: fetchedData,
    loading: fetchLoading,
    error: fetchError,
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
  // The read failed: shown as an error, never as an empty table
  const listError = isPreview ? null : fetchError;

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
  // Rows the last bulk delete (or a save not attempted) did not write: no cell to mark
  const [failedCount, setFailedCount] = useState(0);
  // Cells the last bulk save did not write: in error (DataTable list) until edited
  const [failedCells, setFailedCells] = useState<FailedCells>({});
  const pendingCount = Object.values(pendingChanges).reduce(
    (sum, row) => sum + Object.keys(row).length,
    0
  );

  // Partial success: saved rows leave the pending set, failed rows stay pending
  // (still marked) so nothing typed is lost; their cells are in error (the list
  // in the bottom bar) until edited. The next save starts a new list.
  const handleSave = async () => {
    setSaving(true);
    setFailedCount(0);
    setFailedCells({});
    const sent = pendingChanges;
    try {
      const { failed } = await bulk({
        updates: Object.entries(sent).map(([id, patch]) => ({
          id,
          patch: patch as Partial<EntityData>,
        })),
      });
      const failedIds = new Set(failed.map((f) => f.id));
      setPendingChanges(
        Object.fromEntries(
          Object.entries(sent).filter(([id]) => failedIds.has(id))
        )
      );
      setFailedCells(
        failedCellsOf(
          failed,
          (failure) =>
            failure.id !== undefined && sent[failure.id]
              ? { id: failure.id, values: sent[failure.id]! }
              : null,
          saveFailureMessage(entity, t)
        )
      );
    } catch {
      // Batch not attempted: every edit stays pending
      setFailedCount(Object.keys(pendingChanges).length);
    } finally {
      setSaving(false);
    }
  };

  const { t: tCrud } = useTranslation('crud');

  // Entity + crud namespaces so formatValue can resolve crud:price.* etc.
  const { t, language } = useTranslation([entity.namespace, 'crud']);

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
    language,
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

  const words = useListWords(entity);
  // Records listed: in server mode the query's total (the rows are one page)
  const serverTotal = effectiveMode === 'server' ? listData?.total : undefined;
  const resultCount = serverTotal ?? filteredData.length;
  const filtered = searchQuery !== '' || activeFilterCount > 0;

  // Read-only list (editable={false}): no Add
  const add = !editable ? null : isPreview ? (
    <Button intent="add" variant="primary" disabled>
      {tCrud('addNew')}
    </Button>
  ) : (
    <Button
      intent="add"
      variant="primary"
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
  );

  // Always show table structure - DataTable will show skeleton rows when loading
  return (
    <ListSection
      title={words.heading({
        loading,
        failed: !!listError,
        count: resultCount,
      })}
      add={add}
      tone={tone}
    >
      {listError ? (
        <CrudLoadError
          error={listError}
          entity={words.names}
          onRetry={handleRefresh}
        />
      ) : (
        <DataTable
          data={filteredData}
          columns={columns}
          sortable={!isPreview}
          searchable={false}
          // One toolbar row: [search][Filters] … [Export][Refresh][app actions]
          toolbarStart={
            <>
              <Input
                placeholder={tCrud('actions.searchPlaceholder')}
                aria-label={tCrud('actions.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={Search}
                className="dndev-w-full"
                disabled={isPreview}
              />
              {!hideFilters && (
                <FiltersButton
                  entity={entity}
                  data={rawData}
                  fieldsToFilter={fieldsToShow}
                  viewerRole={viewerRole}
                  activeCount={activeFilterCount}
                  disabled={isPreview}
                />
              )}
            </>
          }
          toolbarEnd={
            <>
              <Button
                intent="reload"
                variant="outline"
                onClick={handleRefresh}
                disabled={isPreview || loading}
                aria-label={tCrud('actions.refresh')}
              >
                {tCrud('actions.refresh')}
              </Button>
              {actions && <ToolbarActions actions={actions} />}
            </>
          }
          emptyState={
            <ListEmptyState
              filtered={filtered}
              searchQuery={searchQuery}
              emptyLabel={words.empty}
              add={add}
              onClear={() => {
                setSearchQuery('');
                setFilters({});
              }}
            />
          }
          pagination
          loading={loading}
          onRowClick={isPreview ? undefined : (item) => handleView(item.id)}
          // Read-only list (editable={false}): no selection, no delete
          selectable={!isPreview && editable}
          getRowId={(row: EntityData) => row.id}
          // Cells the last save rejected, while their value is the one sent
          cellErrors={failedCellErrors(
            failedCells,
            (id, field) => pendingChanges[id]?.[field]
          )}
          onSelect={(rows: EntityData[]) =>
            setSelectedIds(rows.map((row) => row.id))
          }
          openLabel={tCrud('actions.open')}
          {...(!isPreview &&
            (onClick
              ? { onRowOpen: (row: EntityData) => onClick(row.id) }
              : { getRowHref: (row: EntityData) => `${base}/${row.id}` }))}
          // Bottom bar: checked rows (bulk edit + delete), unsaved edits.
          // deletable={false}: selection stays for bulk edit, no Delete
          {...(!isPreview &&
            editable &&
            deletable && {
              selectionActions: () => (
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
                  display="full"
                >
                  {tCrud('bulkEdit.deleteSelected', {
                    count: checkedIds.length,
                  })}
                </ActionButton>
              ),
            })}
          {...((pendingCount > 0 || failedCount > 0) && {
            actionBarContent: (
              <PendingBar
                count={isEditing ? pendingCount : 0}
                saving={saving}
                failure={
                  failedCount > 0
                    ? tCrud('bulkEdit.failed', { count: failedCount })
                    : null
                }
                onSave={() => void handleSave()}
                onDiscard={() => {
                  setPendingChanges({});
                  setFailedCount(0);
                  setFailedCells({});
                }}
              />
            ),
          })}
          {...(isEditing && {
            editable: true,
            pendingChanges,
            onPendingChange: setPendingChanges,
          })}
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
        />
      )}
    </ListSection>
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
  deletable = true,
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
  const { filters, setFilters } = useCrudFilters({
    collection: entity.collection,
  });
  const activeFilterCount = Object.keys(filters).length;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Why the last own Save did not write (invalid rows count, or the write error). */
  const [saveError, setSaveError] = useState<string | null>(null);
  /** Cells the last own Save did not write (partial success): in error until edited. */
  const [failedCells, setFailedCells] = useState<FailedCells>({});
  const { t: tCrud } = useTranslation('crud');
  const { t, language } = useTranslation([entity.namespace, 'crud']);

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
  // Cell errors: the cells the last Save rejected (while their value is the one sent),
  // the entity's rules on the edited rows over them
  const itemsById = new Map(rows.items.map((row) => [row.id, row]));
  const cellErrors = failedCellErrors(failedCells, (id, field) =>
    itemsById.get(id)?.[field]
  );
  for (const [id, fields] of Object.entries(rows.errors)) {
    cellErrors[id] = { ...cellErrors[id], ...fields };
  }
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
    setFailedCells({});
    // What this save sends: a failure's index / id points into it
    const sent = rows.edits;
    try {
      const result = await rows.save();
      if (result) {
        setFailedCells(
          failedCellsOf(
            result.failed,
            (failure) => {
              if (failure.op === 'insert') {
                const added =
                  failure.index === undefined ? undefined : sent.added[failure.index];
                if (!added) return null;
                const { id, ...values } = added;
                return { id, values: { ...values, ...sent.changes[id] } };
              }
              const patch =
                failure.op === 'update' && failure.id !== undefined
                  ? sent.changes[failure.id]
                  : undefined;
              return patch ? { id: failure.id!, values: patch } : null;
            },
            saveFailureMessage(entity, t)
          )
        );
      }
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
  // Phones: with listCardFields, the stacked rows leave the extension columns out
  const extensionPhoneFields = phoneFieldsOf(entity) && new Set<string>();
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
      return {
        key: field.name,
        title: fieldColumnTitle(
          translateFieldLabel(field.name, field.config, t),
          field.config,
          t
        ),
        dataIndex: field.name,
        filterable: !joined,
        // Sized by type; never the row's name; on phones only with listCardFields absent
        ...fieldColumnPreset(field.name, field.config, {
          nameField: undefined,
          phoneFields: extensionPhoneFields,
        }),
        ...(isEditing &&
          field.editable && {
            edit: cellEditFor(
              ext.entity,
              unprefixed,
              viewerRole,
              referenceData,
              t,
              language
            ),
          }),
        ...(field.config.type === 'price' && {
          sortValue: (row: ListRow) => effectivePrice(row[field.name]),
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
      language,
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
  const words = useListWords(entity);
  const showAdd = editable && rows.access.create;
  const filtered = !joined && (searchQuery !== '' || activeFilterCount > 0);
  // deletable={false}: selection stays for bulk edit, no Delete
  const canDelete =
    editable &&
    deletable &&
    checkedIds.length > 0 &&
    (rows.access.delete || checkedIds.every((id) => addedIds.has(id)));

  const add = !showAdd ? null : joined ? (
    // Joined: rows are added in place (picker or blank row), never a navigation.
    <Button
      type="button"
      intent="add"
      variant="primary"
      onClick={() => (linkField ? setPicking(true) : rows.add([{}]))}
      disabled={rows.loading}
    >
      {tCrud('addNew')}
    </Button>
  ) : (
    <Button
      intent="add"
      variant="primary"
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
  );

  return (
    <>
      <ListSection
        title={words.heading({
          loading: rows.loading,
          failed: !!rows.error,
          count: data.length,
        })}
        add={add}
        tone={tone}
      >
        {rows.error ? (
          <CrudLoadError
            error={rows.error}
            entity={words.names}
            onRetry={rows.refresh}
          />
        ) : (
          <DataTable
            data={data}
            columns={columns}
            sortable
            searchable={false}
            // One toolbar row. Joined: all lines shown (no search, filters, export);
            // its unsaved edits sit in the toolbar, not a bottom bar that would cover
            // the parent form's own action footer (its Save writes them).
            {...(joined && {
              toolbarStart: (
                <PendingBar
                  count={rows.pendingCount}
                  saving={false}
                  failure={null}
                  onDiscard={() => rows.discard()}
                />
              ),
            })}
            {...(!joined && {
              toolbarStart: (
                <>
                  <Input
                    placeholder={tCrud('actions.searchPlaceholder')}
                    aria-label={tCrud('actions.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={Search}
                    className="dndev-w-full"
                  />
                  {!hideFilters && (
                    <FiltersButton
                      entity={entity}
                      data={rows.items}
                      fieldsToFilter={fieldsToShow}
                      viewerRole={viewerRole}
                      activeCount={activeFilterCount}
                    />
                  )}
                </>
              ),
            })}
            toolbarEnd={
              <>
                <Button
                  type="button"
                  intent="reload"
                  variant="outline"
                  onClick={() => void rows.refresh()}
                  disabled={rows.loading}
                  aria-label={tCrud('actions.refresh')}
                >
                  {tCrud('actions.refresh')}
                </Button>
                {actions && <ToolbarActions actions={actions} />}
              </>
            }
            emptyState={
              <ListEmptyState
                filtered={filtered}
                searchQuery={searchQuery}
                emptyLabel={words.empty}
                add={add}
                onClear={() => {
                  setSearchQuery('');
                  setFilters({});
                }}
              />
            }
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
            // Fields breaking the entity's rules (checked on every change), and the
            // cells the last Save rejected while their value is the one sent
            cellErrors={cellErrors}
            // Bottom bar: checked rows (bulk edit + delete), unsaved edits
            {...(canDelete && {
              selectionActions: () => (
                <Button
                  type="button"
                  variant="outline"
                  intent="delete"
                  display="full"
                  onClick={() => {
                    rows.remove(checkedIds);
                    setSelectedIds([]);
                  }}
                >
                  {tCrud('bulkEdit.deleteSelected', { count: checkedIds.length })}
                </Button>
              ),
            })}
            {...(!joined &&
              (rows.pendingCount > 0 || saveError) && {
              actionBarContent: (
                <PendingBar
                  count={rows.pendingCount}
                  saving={saving}
                  failure={saveError}
                  {...(!joined && { onSave: () => void save() })}
                  onDiscard={() => {
                    rows.discard();
                    setSaveError(null);
                    setFailedCells({});
                  }}
                />
              ),
            })}
            {...(isEditing && {
              editable: true,
              pendingChanges: rows.edits.changes,
              onPendingChange: applyPending,
            })}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            exportable={!joined && exportable}
            exportFilename={`${entity.collection}-export`}
          />
        )}
      </ListSection>
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
