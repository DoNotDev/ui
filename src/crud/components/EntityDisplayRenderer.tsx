'use client';
// packages/ui/src/crud/components/EntityDisplayRenderer.tsx

/**
 * @fileoverview EntityDisplayRenderer component
 * @description High-level component that automatically fetches and displays entity data in read-only mode.
 * Perfect for detail/view pages - just pass the entity and it handles everything.
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Fragment, useMemo } from 'react';
import type { ReactNode } from 'react';

import {
  ActionButton,
  Button,
  Grid,
  Spinner,
  Stack,
  Text,
} from '@donotdev/components';
import {
  deriveEntitySeo,
  hasRoleAccess,
  isFieldVisible,
  useTranslation,
} from '@donotdev/core';
import type {
  EntityDisplayRendererProps,
  EntityField,
  EntityRecord,
} from '@donotdev/core';

import { Link, useNavigate } from '../../routing';
import { useAuthSafe } from '../../utils/useAuthSafe';
import {
  isCrudModuleAvailable,
  useCrud,
  useCrudDoc,
  useReferenceResolver,
  DisplayThumbnail,
  formatValue,
  translateFieldLabel,
  translateLabel,
} from '../crudImports';
import { CrudLoadError } from './CrudLoadError';
import { useRecordBreadcrumb } from './useRecordBreadcrumb';

export type { EntityDisplayRendererProps };

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Field types with no value to show (form controls, hidden inputs). */
const NON_DISPLAY_TYPES = new Set(['hidden', 'submit', 'reset', 'button']);
const IMAGE_TYPES = new Set(['image', 'images']);

/** Label column ~180 px, values aligned; one column (label above value) on phones. */
const FIELD_GRID_COLS: [string, string, string, string] = [
  'minmax(0, 1fr)',
  '180px minmax(0, 1fr)',
  '180px minmax(0, 1fr)',
  '180px minmax(0, 1fr)',
];
// Module-level styles: no style object per render
const VALUE_STYLE = { margin: 0, minWidth: 0 } as const;
/** Space after each value: on phones a label sits closer to its own value than to the previous one. */
const DETAILS_STYLE = {
  ...VALUE_STYLE,
  paddingBlockEnd: 'var(--gap-sm)',
} as const;
const THUMB_STYLE = { width: '64px', flexShrink: 0 } as const;

/** One titled group of fields (`field.group`); `title` undefined = the ungrouped fields. */
interface FieldSection {
  key: string;
  title?: string;
  fields: Array<[string, EntityField]>;
}

/**
 * Fields in sections by `field.group` (first appearance order): ungrouped fields
 * first, without a title, then one titled section per group.
 */
function sectionsOf(fields: Array<[string, EntityField]>): FieldSection[] {
  const ungrouped: FieldSection = { key: '', fields: [] };
  const groups = new Map<string, FieldSection>();
  for (const entry of fields) {
    const group = entry[1].group;
    if (!group) {
      ungrouped.fields.push(entry);
      continue;
    }
    const section = groups.get(group.name) ?? {
      key: group.name,
      title: group.title ?? group.name,
      fields: [],
    };
    section.fields.push(entry);
    groups.set(group.name, section);
  }
  return [ungrouped, ...groups.values()].filter((s) => s.fields.length > 0);
}

/**
 * EntityDisplayRenderer - Automatically fetches and displays entity data
 *
 * Features:
 * - Reactive data fetching using useCrudDoc (stays in sync with edits)
 * - Header: thumbnail (first image field with a value), record name (the card title,
 *   `deriveEntitySeo`: `seo.title`, `listCardFields.title`, else the first text field),
 *   status badge, Edit / Delete buttons at the end (viewer with `access.update` /
 *   `access.delete`; `hideActions` removes them)
 * - Fields in a label | value grid (180 px label column, one column on phones),
 *   grouped by `field.group` (titled sections), visibility rules applied
 * - References show their label (`useReferenceResolver`, as in EntityList), empty
 *   fields a muted "—" so gaps are visible
 * - Load error and missing record as translated messages (`crud:errors.*`)
 * - Full i18n support
 *
 * Routing: Edit opens `${basePath}/${id}/edit`; Delete (logical delete, `remove`, after
 * a confirmation) returns to `basePath`. `basePath` defaults to `/${entity.collection}`.
 *
 * @example
 * ```tsx
 * <EntityDisplayRenderer entity={carEntity} id={carId} />
 * ```
 */
export function EntityDisplayRenderer<T extends EntityRecord = EntityRecord>({
  entity,
  id,
  t,
  className = '',
  loadingMessage,
  notFoundMessage,
  viewerRole: viewerRoleProp,
  excludeFields,
  preview,
  basePath,
  hideActions,
}: EntityDisplayRendererProps<T>) {
  // Safe guard: isCrudModuleAvailable is a module-level constant (immutable after load).

  if (!isCrudModuleAvailable) return null;

  const isPreview = !!preview;
  const base = basePath ?? `/${entity.collection}`;

  // Auto-detect role from auth; prop overrides. Preview = design-time showcase, show all fields.
  const authRole = useAuthSafe('userRole');
  const viewerRole = viewerRoleProp ?? (isPreview ? 'super' : authRole);
  // Reactive read: re-renders on every cache write for this document (edits, deletes)
  const {
    data: fetchedData,
    loading,
    error,
    notFound,
    refresh,
  } = useCrudDoc<T>(entity, id, { enabled: !isPreview });
  // Reference labels (same resolver as EntityList): a supplier shows its name, not its id
  const referenceData = useReferenceResolver(entity, !isPreview);
  const { remove } = useCrud(entity);
  const navigate = useNavigate();

  // Entity + crud namespaces so formatValue can resolve crud:price.* etc.
  const { t: tDual, language } = useTranslation([entity.namespace, 'crud']);
  const { t: tCrud } = useTranslation('crud');
  const translate: Translate = t || tDual;

  // Preview: design-time showcase data, no read
  const displayData = isPreview ? (preview as T) : fetchedData;
  const record = displayData as Record<string, unknown> | null | undefined;
  // Breadcrumb shows the record's name instead of its id
  useRecordBreadcrumb(entity, isPreview ? null : (record ?? null));
  const displayError = isPreview ? null : error;
  const isLoading = isPreview ? false : loading || !id;

  // Visible fields (empty ones included: shown as "—"), in entity order
  // MUST be called before any early returns (Rules of Hooks)
  const visibleFields = useMemo(() => {
    if (!record) return [];
    return Object.entries(entity.fields).filter(([fieldName, fieldConfig]) => {
      if (excludeFields?.includes(fieldName)) return false;
      if (!isFieldVisible(fieldConfig.visibility, viewerRole)) return false;
      if (fieldConfig.visibility === 'hidden') return false;
      if (NON_DISPLAY_TYPES.has(fieldConfig.type)) return false;
      // displayValue resolver returning null hides the field for this record
      return (
        fieldConfig.options?.displayValue?.(
          record[fieldName],
          record,
          translate
        ) !== null
      );
    });
  }, [entity.fields, viewerRole, record, excludeFields, translate]);

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          gridColumn: '1 / -1',
          display: 'contents',
        }}
        className={className}
      >
        <Spinner overlay aria-label={loadingMessage || tCrud('form.loading')} />
      </div>
    );
  }

  // CRUD unavailable (consent declined / feature absent): nothing will load
  if (!displayData && !displayError && !notFound) return null;

  const entityLabel = tDual('name', { defaultValue: entity.name });

  // Error or not found state: translated messages only (no raw error text)
  if (displayError || !record) {
    return (
      <Stack align="center" justify="center" className={className}>
        {displayError ? (
          <CrudLoadError
            error={displayError}
            entity={entityLabel}
            onRetry={refresh}
          />
        ) : (
          <Text as="h3" level="h4" variant="muted">
            {notFoundMessage ||
              tCrud('errors.notFound', { entity: entityLabel })}
          </Text>
        )}
      </Stack>
    );
  }

  const valueOf = (fieldName: string, fieldConfig: EntityField): ReactNode => {
    const formatted = formatValue(record[fieldName], fieldConfig, translate, {
      referenceData,
      item: record,
    });
    return typeof formatted === 'string' ? <Text>{formatted}</Text> : formatted;
  };

  // Header: thumbnail, record name, status badge, actions
  const title = deriveEntitySeo(entity, record, {
    t: translate,
    locale: language,
  }).title;
  const imageField = visibleFields.find(
    ([name, field]) => IMAGE_TYPES.has(field.type) && record[name] != null
  );
  const statusField = visibleFields.find(([name]) => name === 'status');
  const statusValue = statusField ? record.status : undefined;
  const canEdit = hasRoleAccess(viewerRole, entity.access.update);
  const canDelete = hasRoleAccess(viewerRole, entity.access.delete);
  const showActions = !hideActions && (canEdit || canDelete);

  return (
    <Stack direction="column" gap="large" className={className}>
      <Stack direction="row" gap="medium" align="center" wrap="wrap">
        {imageField && (
          <DisplayThumbnail
            // why: IMAGE_TYPES fixes the stored shape; the record value is unknown
            pictures={
              record[imageField[0]] as Parameters<
                typeof DisplayThumbnail
              >[0]['pictures']
            }
            alt={title ?? ''}
            aspectRatio="1"
            style={THUMB_STYLE}
          />
        )}
        <Stack direction="column" gap="tight" flex="1">
          {title && (
            <Text as="h1" level="h2">
              {title}
            </Text>
          )}
          {statusField && statusValue != null && statusValue !== '' && (
            <Stack direction="row">
              {formatValue(statusValue, statusField[1], translate, {
                compact: true,
                item: record,
              })}
            </Stack>
          )}
        </Stack>
        {showActions && (
          <Stack direction="row" gap="tight" align="center">
            {canEdit &&
              (isPreview || !id ? (
                <Button intent="edit" variant="outline" disabled>
                  {tCrud('actions.edit')}
                </Button>
              ) : (
                <Button
                  intent="edit"
                  variant="outline"
                  render={({ children, ...renderProps }) => (
                    <Link path={`${base}/${id}/edit`} {...renderProps}>
                      {children}
                    </Link>
                  )}
                >
                  {tCrud('actions.edit')}
                </Button>
              ))}
            {canDelete && (
              <ActionButton
                action={async () => {
                  if (!id) return;
                  await remove(id);
                  navigate(base);
                }}
                disabled={isPreview || !id}
                confirmTitle={tCrud('delete.title')}
                confirmText={tCrud('delete.confirm')}
                confirmLabel={tCrud('actions.delete')}
                cancelLabel={tCrud('actions.cancel')}
                loadingText={tCrud('delete.loading')}
                variant="outline"
                intent="delete"
              >
                {tCrud('actions.delete')}
              </ActionButton>
            )}
          </Stack>
        )}
      </Stack>

      {sectionsOf(visibleFields).map((section) => (
        <Stack key={section.key} direction="column" gap="medium">
          {section.title && (
            <Text as="h2" level="h4">
              {translateLabel(section.title, translate)}
            </Text>
          )}
          <Grid as="dl" cols={FIELD_GRID_COLS} gap="tight" align="start">
            {section.fields.map(([fieldName, fieldConfig]) => (
              <Fragment key={fieldName}>
                <Stack as="dt" style={VALUE_STYLE}>
                  <Text level="small" variant="muted" weight="medium">
                    {translateFieldLabel(fieldName, fieldConfig, translate)}
                  </Text>
                </Stack>
                <Stack as="dd" style={DETAILS_STYLE}>
                  {valueOf(fieldName, fieldConfig)}
                </Stack>
              </Fragment>
            ))}
          </Grid>
        </Stack>
      ))}
    </Stack>
  );
}

export default EntityDisplayRenderer;
