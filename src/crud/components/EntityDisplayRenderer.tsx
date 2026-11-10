'use client';
// packages/ui/src/crud/components/EntityDisplayRenderer.tsx

/**
 * @fileoverview EntityDisplayRenderer component
 * @description High-level component that automatically fetches and displays entity data in read-only mode.
 * Perfect for detail/view pages - just pass the entity and it handles everything.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useMemo } from 'react';

import { Stack, Spinner } from '@donotdev/components';
import { useTranslation, isFieldVisible } from '@donotdev/core';
import type { Entity, UserRole } from '@donotdev/core';
import type { EntityDisplayRendererProps, EntityRecord } from '@donotdev/core';

import { useAuthSafe } from '../../utils/useAuthSafe';
import {
  isCrudModuleAvailable,
  useCrudDoc,
  DisplayFieldRenderer,
} from '../crudImports';

export type { EntityDisplayRendererProps };

/**
 * EntityDisplayRenderer - Automatically fetches and displays entity data
 *
 * Features:
 * - Reactive data fetching using useCrudDoc (stays in sync with edits)
 * - Loading state handling
 * - Error handling
 * - Automatic field rendering (respects visibility rules)
 * - Full i18n support
 * - No form/submit buttons - pure read-only display
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
}: EntityDisplayRendererProps<T>) {
  // Safe guard: isCrudModuleAvailable is a module-level constant (immutable after load).

  if (!isCrudModuleAvailable) return null;

  const isPreview = !!preview;

  // Auto-detect role from auth; prop overrides. Preview = design-time showcase, show all fields.
  const authRole = useAuthSafe('userRole');
  const viewerRole = viewerRoleProp ?? (isPreview ? 'super' : authRole);
  // Reactive read: re-renders on every cache write for this document (edits, deletes)
  const {
    data: fetchedData,
    loading,
    error,
    notFound,
  } = useCrudDoc<T>(entity, id, { enabled: !isPreview });

  // Entity + crud namespaces so formatValue can resolve crud:price.* etc.
  const { t: tDual } = useTranslation([entity.namespace, 'crud']);
  const { t: tCrud } = useTranslation('crud');
  const translate = t || tDual;

  // Preview: design-time showcase data, no read
  const displayData = isPreview ? (preview as T) : fetchedData;
  const displayError = isPreview ? null : error;
  const isLoading = isPreview ? false : loading || !id;

  // Filter fields: respect visibility AND skip empty values
  // MUST be called before any early returns (Rules of Hooks)
  const visibleFields = useMemo(() => {
    if (!displayData) return [];

    return Object.entries(entity.fields).filter(([fieldName, fieldConfig]) => {
      // Skip excluded fields
      if (excludeFields?.includes(fieldName)) {
        return false;
      }

      // Check visibility first
      if (!isFieldVisible(fieldConfig.visibility, viewerRole)) {
        return false;
      }

      // Skip hidden fields
      if (fieldConfig.visibility === 'hidden') {
        return false;
      }

      // Get field value (displayData may be preview T or cached row; entity is AnyEntity in props)
      const value = (displayData as Record<string, unknown>)[fieldName];

      // Hide if value is empty/null/undefined
      if (value === null || value === undefined) {
        return false;
      }

      // Hide empty strings
      if (typeof value === 'string' && value.trim() === '') {
        return false;
      }

      // Hide empty arrays
      if (Array.isArray(value) && value.length === 0) {
        return false;
      }

      // Hide empty objects (but allow objects with properties)
      if (
        typeof value === 'object' &&
        !Array.isArray(value) &&
        value !== null &&
        Object.keys(value).length === 0
      ) {
        return false;
      }

      return true;
    });
  }, [entity.fields, viewerRole, displayData, excludeFields]);

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
        <Spinner
          overlay
          aria-label={
            loadingMessage ||
            tCrud('form.loading', { defaultValue: 'Loading...' })
          }
        />
      </div>
    );
  }

  // CRUD unavailable (consent declined / feature absent): nothing will load
  if (!displayData && !displayError && !notFound) return null;

  // Error or not found state
  if (displayError || !displayData) {
    return (
      <Stack
        align="center"
        justify="center"
        style={{
          padding: 'var(--gap-3xl)',
          textAlign: 'center',
        }}
        className={className}
      >
        <Stack direction="column" gap="tight">
          <h3 style={{ color: 'var(--muted-foreground)' }}>
            {notFoundMessage ||
              tCrud('errors.notFound', {
                defaultValue: `${entity.name} not found`,
              })}
          </h3>
          {displayError && (
            <p
              style={{
                color: 'var(--destructive)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              {displayError instanceof Error
                ? displayError.message
                : String(displayError)}
            </p>
          )}
        </Stack>
      </Stack>
    );
  }

  // Render all visible fields with values
  return (
    <Stack direction="column" className={className}>
      {visibleFields.map(([fieldName, fieldConfig]) => {
        return (
          <DisplayFieldRenderer
            key={fieldName}
            name={fieldName}
            config={fieldConfig}
            value={(displayData as Record<string, unknown>)[fieldName]}
            t={translate}
          />
        );
      })}
    </Stack>
  );
}

export default EntityDisplayRenderer;
