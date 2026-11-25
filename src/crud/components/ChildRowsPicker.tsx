'use client';
// packages/ui/src/crud/components/ChildRowsPicker.tsx

/**
 * @fileoverview Link table picker
 * @description Dialog of a joined `EntityList` on a link table (the child has
 * one reference besides the parent's): the other side's records with
 * `EntityFilters` (for the viewer's role, own filter state: the lists of that
 * collection keep theirs) and a text search over a selectable list; deleted and
 * already-linked records excluded; multi-select. Picked records become unsaved
 * rows. Loaded lazily by EntityList.
 *
 * @version 0.1.0
 * @since 0.2.5
 * @author AMBROISE PARK Consulting
 */

import { Search } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  DataTable,
  Dialog,
  Input,
  Stack,
  Text,
} from '@donotdev/components';
import type { TableColumn } from '@donotdev/components';
import { fieldColumnTitle, statusCan, useTranslation } from '@donotdev/core';
import type { AnyEntity } from '@donotdev/core';

import {
  EntityFilters,
  applyFilters,
  applySearch,
  formatValue,
  translateFieldLabel,
  useCrudFilters,
  useCrudList,
  useReferenceResolver,
} from '../crudImports';

type PickRow = Record<string, unknown> & { id: string };

/** Props of {@link ChildRowsPicker}. */
export interface ChildRowsPickerProps {
  /** Entity of the other side of the link table (the records to pick) */
  entity: AnyEntity;
  /** Records already linked (not offered) */
  excludedIds: ReadonlySet<string>;
  /** The viewer's role: which fields the filters offer (`visibility`) */
  viewerRole: string;
  /** Called with the picked record ids */
  onPick: (ids: string[]) => void;
  /** Closes the dialog */
  onClose: () => void;
}

/**
 * Pick records of the other side of a link table: filters, text search,
 * selectable list (deleted and already-linked records excluded), multi-select,
 * "Add selected".
 */
export default function ChildRowsPicker({
  entity,
  excludedIds,
  viewerRole,
  onPick,
  onClose,
}: ChildRowsPickerProps) {
  const { t } = useTranslation([entity.namespace, 'crud']);
  const { t: tCrud } = useTranslation('crud');
  const list = useCrudList(entity, { pagination: 'client' });
  const referenceData = useReferenceResolver(entity);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Own filter state: picking must not filter the lists of this collection.
  const filterKey = `${entity.collection}#picker`;
  const { filters } = useCrudFilters({ collection: filterKey });

  // Removed records (STATUS_MATRIX `isRemoved`) are never offered.
  const candidates: PickRow[] = list.items.filter(
    (row: PickRow) =>
      !statusCan(typeof row.status === 'string' ? row.status : null, 'isRemoved') &&
      !excludedIds.has(row.id)
  );
  const available = applySearch(
    applyFilters(candidates, filters, entity),
    searchQuery,
    entity
  );
  const fields = entity.listFields || Object.keys(entity.fields);
  const columns: TableColumn<PickRow>[] = fields.flatMap((fieldName) => {
    const config = entity.fields[fieldName];
    if (!config) return [];
    return [
      {
        key: fieldName,
        // Price columns carry the note their cells leave out ('VAT incl.')
        title: fieldColumnTitle(
          translateFieldLabel(fieldName, config, t),
          config,
          t
        ),
        dataIndex: fieldName,
        sortable: true,
        render: (value: unknown, record: PickRow) =>
          formatValue(value, config, t, {
            compact: true,
            referenceData,
            item: record,
          }),
      },
    ];
  });
  const entityName = t('name', { defaultValue: entity.name });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={tCrud('childRows.pickTitle', { entity: entityName })}
      footer={
        <Stack direction="row" gap="tight" justify="end">
          <Button variant="outline" onClick={onClose}>
            {tCrud('actions.cancel')}
          </Button>
          <Button
            intent="add"
            disabled={selectedIds.length === 0}
            onClick={() => {
              onPick(selectedIds);
              onClose();
            }}
          >
            {tCrud('childRows.pickConfirm', { count: selectedIds.length })}
          </Button>
        </Stack>
      }
    >
      <Stack>
        <EntityFilters
          entity={entity}
          data={candidates}
          fieldsToFilter={fields}
          viewerRole={viewerRole}
          filterKey={filterKey}
        />
        <Input
          placeholder={tCrud('actions.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={Search}
          className="dndev-w-full"
        />
        {!list.loading && available.length === 0 ? (
          <Text level="body">{tCrud('childRows.pickEmpty')}</Text>
        ) : (
          <DataTable
            data={available}
            columns={columns}
            sortable
            searchable={false}
            pagination
            loading={list.loading}
            selectable
            getRowId={(row: PickRow) => row.id}
            onSelect={(rows: PickRow[]) =>
              setSelectedIds(rows.map((row) => row.id))
            }
          />
        )}
      </Stack>
    </Dialog>
  );
}
