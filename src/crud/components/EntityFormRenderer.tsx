'use client';
// packages/ui/src/crud/components/EntityFormRenderer.tsx

/**
 * @fileoverview EntityFormRenderer component
 * @description Dumb renderer that composes form from entity definition.
 * All orchestration logic lives in useEntityForm.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { FormProvider } from 'react-hook-form';

import {
  Badge,
  Button,
  DropdownMenu,
  Grid,
  Stack,
  Spinner,
} from '@donotdev/components';
import { hasRoleAccess, useTranslation } from '@donotdev/core';
import type {
  EntityFormRendererProps,
  EntityRecord,
  Visibility,
} from '@donotdev/core';
import {
  isCrudModuleAvailable,
  DisplayFieldRenderer,
  FormFieldRenderer,
  UploadProvider,
  useEntityForm,
  useFormStore,
  useFieldConditions,
} from '../crudImports';
import type { InferEntityData } from '@donotdev/crud';

import { useNavigate } from '../../routing';
import { useAuthSafe } from '../../utils/useAuthSafe';

export type { EntityFormRendererProps };

/**
 * EntityFormRenderer - Dumb component that renders a form from entity definition.
 *
 * All orchestration (uploads, validation, status tracking) is handled by useEntityForm.
 * This component just:
 * - Generates formId
 * - Renders fields
 * - Renders submit button with status from useEntityForm
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
/**
 * EntityFormRenderer - public API.
 * Applies instanceKey as React key on the inner component for clean state isolation
 * when navigating between entities on the same route (e.g. /cars/:id).
 */
export function EntityFormRenderer<T extends EntityRecord = EntityRecord>(
  props: EntityFormRendererProps<T>
) {
  const { instanceKey, ...rest } = props;
  return <EntityFormRendererCore<T> key={instanceKey} {...rest} />;
}

function EntityFormRendererCore<T extends EntityRecord = EntityRecord>({
  entity,
  onSubmit,
  t,
  className = '',
  submitText,
  loading = false,
  defaultValues,
  submitVariant = 'primary',
  secondaryButtonText,
  secondaryButtonVariant = 'outline',
  onSecondarySubmit,
  viewerRole: viewerRoleProp,
  operation = defaultValues ? 'edit' : 'create',
  formId: externalFormId,
  cancelText,
  cancelPath,
  successPath,
  onCancel,
  hideVisibilityInfo = false,
}: Omit<EntityFormRendererProps<T>, 'instanceKey'>) {
  // Safe guard: isCrudModuleAvailable is a module-level constant (immutable after load).
  // Hooks below are either ALL called or NONE — no Rules-of-Hooks violation at runtime.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (!isCrudModuleAvailable) return null;

  const navigate = useNavigate();

  // Auto-detect role from auth; prop overrides (e.g. View-As preview)
  const authRole = useAuthSafe('userRole');
  const viewerRole = viewerRoleProp ?? authRole;

  // Generate stable form ID
  const generatedFormId = useId();
  const formId =
    externalFormId ?? `entity-form-${entity.name}-${generatedFormId}`;

  // Entity + crud namespaces so translateLabel can resolve crud:status.* etc.
  const { t: translationFn } = useTranslation([entity.namespace, 'crud']);
  const { t: tCrud } = useTranslation('crud');
  const translate = t || translationFn;

  // Visibility badges (developer-facing) are for admins/super only
  const isAdminOrSuper = viewerRole === 'admin' || viewerRole === 'super';
  const showVisibilityBadges = !hideVisibilityInfo && isAdminOrSuper;

  // Preview dropdown (View As) is available for user/admin/super
  const canPreviewRole =
    viewerRole === 'user' || viewerRole === 'admin' || viewerRole === 'super';

  // Preview role state for View As toggle
  const [previewRole, setPreviewRole] = useState<
    'guest' | 'user' | 'admin' | 'super'
  >(
    viewerRole === 'admin' || viewerRole === 'super' || viewerRole === 'user'
      ? (viewerRole as 'guest' | 'user' | 'admin' | 'super')
      : 'guest'
  );

  // Visibility → Badge variant mapping (inline, no separate file needed)
  const visibilityBadgeVariant: Record<
    Exclude<Visibility, 'hidden'>,
    'muted' | 'secondary' | 'warning' | 'destructive' | 'accent'
  > = {
    guest: 'muted',
    user: 'secondary',
    admin: 'warning',
    super: 'destructive',
    technical: 'accent',
    owner: 'secondary',
  };

  // Role hierarchy for filtering (higher index = more access)
  const roleHierarchy = ['guest', 'user', 'admin', 'super'] as const;

  // Role display labels (hardcoded English - universal technical terms)
  const roleLabels = {
    guest: 'Guest',
    user: 'User',
    admin: 'Admin',
    super: 'Super',
    technical: 'System',
  } as const;

  // Preview dropdown menu items (roles current viewer can assume)
  const previewMenuItems = useMemo(
    () =>
      roleHierarchy
        .filter((role) => hasRoleAccess(viewerRole, role))
        .map((role) => ({
          label: roleLabels[role],
          checked: previewRole === role,
          onClick: () => setPreviewRole(role),
        })),
    [previewRole, viewerRole]
  );

  // useEntityForm handles all orchestration
  const form = useEntityForm(entity, {
    formId,
    operation,
    defaultValues,
    viewerRole,
    t: translate,
    loading,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    fields: rawFields,
    formStatus,
    uploadProgress,
    isDirty,
    hasUserInteracted,
    resetForm,
  } = form;

  const isDirtyForBlocking = isDirty && hasUserInteracted;

  // Filter fields based on previewRole when visibility info is shown
  const renderableFields = useMemo(() => {
    if (!canPreviewRole) return rawFields;

    const previewRoleIndex = roleHierarchy.indexOf(previewRole);
    return rawFields.filter(({ config }) => {
      const fieldVisibility = config.visibility;
      // 'hidden' fields are never shown, 'technical' always shown as read-only
      if (fieldVisibility === 'hidden') return false;
      if (fieldVisibility === 'technical') return true;

      const fieldRoleIndex = roleHierarchy.indexOf(
        fieldVisibility as (typeof roleHierarchy)[number]
      );
      return fieldRoleIndex <= previewRoleIndex;
    });
  }, [rawFields, canPreviewRole, previewRole]);

  // Evaluate field conditions (visible/disabled/required/readonly) against live form values
  const fieldConditions = useFieldConditions(renderableFields, control);

  // Sync isDirty to FormStore (single source of truth)
  // Use getState() to avoid subscribing to the action reference (Zustand anti-pattern)
  useEffect(() => {
    if (formId) {
      useFormStore.getState().setIsDirty(formId, isDirtyForBlocking);
    }
  }, [formId, isDirtyForBlocking]);

  // Handle cancel — auto-save ensures draft is persisted, no confirm needed
  const handleCancel = () => {
    resetForm();
    if (onCancel) {
      onCancel();
    } else if (cancelPath) {
      navigate(cancelPath);
    } else {
      navigate('back');
    }
  };

  // Infer the actual entity data type from the entity definition
  type EntityData = InferEntityData<typeof entity>;

  // Wrap onSubmit to await the result before navigating
  // handleSubmit from react-hook-form expects: (data: EntityData) => void | Promise<void>
  // Our onSubmit prop is (data: T) => void | Promise<void>, where T extends EntityRecord
  // EntityData should be compatible with T, so we can safely pass it
  // No try/catch here — errors MUST propagate to useEntityForm's orchestrator
  // which properly calls setError() and does NOT clearDraft/reset.
  const handleFormSubmit = async (data: EntityData) => {
    await onSubmit(data as T);

    // Navigate only when successPath is explicitly provided.
    // Edit: stay on page (most common UX). Create: consumer navigates
    // in onSubmit (knows the new ID) or provides successPath.
    if (successPath) {
      navigate(successPath);
    }
  };

  // Determine if cancel button should show
  // Show by default, hide only if cancelText is explicitly null
  const showCancelButton = cancelText !== null;
  const cancelButtonText =
    cancelText ?? tCrud('form.cancel', { defaultValue: 'Cancel' });

  // Common button container style (sticky footer)
  const buttonContainerStyle = {
    gridColumn: '1 / -1',
    position: 'sticky' as const,
    bottom: 0,
    backgroundColor: 'var(--background)',
    borderTop: '1px solid var(--border)',
    paddingTop: 'var(--gap-md)',
    paddingBottom: 'var(--gap-md)',
    zIndex: 10,
    marginTop: 'var(--gap-lg)',
  };

  // Auto-detect loading for edit forms waiting for data
  const isLoading = loading || (operation === 'edit' && !defaultValues);

  // Compute button state from form status
  const buttonState = useMemo(() => {
    if (formStatus === 'uploading') {
      return {
        loading: true,
        loadingText:
          uploadProgress < 100
            ? tCrud('form.uploading', {
                progress: Math.round(uploadProgress),
                defaultValue: `Uploading ${Math.round(uploadProgress)}%...`,
              })
            : tCrud('form.processing', { defaultValue: 'Processing...' }),
        progress: uploadProgress,
      };
    }
    if (formStatus === 'validating') {
      return {
        loading: true,
        loadingText: tCrud('form.validating', {
          defaultValue: 'Validating...',
        }),
      };
    }
    if (formStatus === 'submitting') {
      return {
        loading: true,
        loadingText: tCrud('form.saving', { defaultValue: 'Saving...' }),
      };
    }
    if (formStatus === 'success') {
      return {
        loading: false,
        successText: tCrud('form.saved', { defaultValue: 'Saved' }),
      };
    }
    if (formStatus === 'error') {
      return {
        loading: false,
        errorText: tCrud('form.error', {
          defaultValue: 'Error — try again',
        }),
      };
    }
    return { loading: false };
  }, [formStatus, uploadProgress, tCrud]);

  return (
    <FormProvider {...form}>
      <UploadProvider formId={formId}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            gridColumn: '1 / -1',
            display: 'contents',
          }}
        >
          {isLoading && <Spinner overlay />}
          <form
            onSubmit={(e) => {
              console.log('[EntityFormRenderer] native form onSubmit event', { defaultPrevented: e.defaultPrevented });
              return handleSubmit(handleFormSubmit)(e);
            }}
            noValidate
            className={className}
            style={{ width: '100%', gridColumn: '1 / -1', display: 'contents' }}
          >
            {/* Render fields */}
            {renderableFields.map(({ name, config, editable }) => {
              // Evaluate dynamic conditions for this field
              const cond = fieldConditions[name];
              if (cond && !cond.visible) return null;

              // Apply condition overrides to field config
              const effectiveConfig = cond
                ? {
                    ...config,
                    // Merge dynamic required into validation (condition overrides static)
                    ...(cond.required && config.validation
                      ? { validation: { ...config.validation, required: true } }
                      : cond.required
                        ? { validation: { required: true } }
                        : {}),
                  }
                : config;

              // Condition-based disabled/readonly override editability
              const effectiveEditable =
                editable && !cond?.disabled && !cond?.readonly;

              // Show visibility badge for non-guest fields when visibility badges are enabled (admins/super only)
              const showBadge =
                showVisibilityBadges && config.visibility !== 'guest';
              const badgeVariant =
                config.visibility !== 'hidden'
                  ? visibilityBadgeVariant[config.visibility]
                  : undefined;
              const badgeLabel =
                roleLabels[config.visibility as keyof typeof roleLabels] ??
                config.visibility;
              // Wrap field with visibility badge when enabled
              const fieldElement = !effectiveEditable ? (
                <DisplayFieldRenderer
                  key={name}
                  name={name}
                  config={effectiveConfig}
                  value={defaultValues?.[name as keyof T]}
                  t={translate}
                />
              ) : (
                <FormFieldRenderer
                  key={name}
                  name={name}
                  config={effectiveConfig}
                  control={control}
                  errors={errors}
                  t={translate}
                />
              );

              // If no badge needed, return field directly
              if (!showBadge) return fieldElement;

              // Wrap field with badge indicator
              return (
                <div key={name} style={{ position: 'relative' }}>
                  <Badge
                    as="span"
                    variant={badgeVariant}
                    style={{
                      position: 'absolute',
                      top: 0,
                      insetInlineEnd: 0,
                      fontSize: 'var(--font-size-xs)',
                      zIndex: 1,
                    }}
                  >
                    {badgeLabel}
                  </Badge>
                  {fieldElement}
                </div>
              );
            })}

            {/* Submit buttons */}
            {(() => {
              // Define all possible buttons (conditionally included)
              const buttons: Array<ReactNode> = [];

              // Cancel button
              if (showCancelButton && cancelButtonText) {
                buttons.push(
                  <Button
                    key="cancel"
                    type="button"
                    onClick={handleCancel}
                    disabled={buttonState.loading}
                    variant="outline"
                    className="dndev-w-full"
                  >
                    {cancelButtonText}
                  </Button>
                );
              }

              // Preview dropdown (user/admin/super only)
              if (canPreviewRole) {
                const previewVariant =
                  visibilityBadgeVariant[previewRole] || 'muted';
                buttons.push(
                  <DropdownMenu
                    key="preview"
                    trigger={
                      <Button
                        type="button"
                        variant={previewVariant}
                        disabled={buttonState.loading}
                        className="dndev-w-full"
                      >
                        {tCrud('visibility.preview', {
                          defaultValue: 'Preview',
                        })}
                        : {roleLabels[previewRole]}
                      </Button>
                    }
                    items={previewMenuItems}
                  />
                );
              }

              // Secondary submit button
              if (secondaryButtonText) {
                buttons.push(
                  <Button
                    key="secondary"
                    type="button"
                    onClick={() => {
                      if (onSecondarySubmit) {
                        const currentValues = form.getValues() as EntityData;
                        onSecondarySubmit(currentValues as T);
                      }
                    }}
                    loading={buttonState.loading}
                    loadingText={buttonState.loadingText}
                    progress={buttonState.progress}
                    variant={secondaryButtonVariant}
                    className="dndev-w-full"
                  >
                    {secondaryButtonText}
                  </Button>
                );
              }

              // Primary submit button (always shown)
              buttons.push(
                <Button
                  key="submit"
                  type="submit"
                  loading={buttonState.loading}
                  loadingText={buttonState.loadingText}
                  progress={buttonState.progress}
                  variant={
                    buttonState.successText
                      ? 'success'
                      : buttonState.errorText
                        ? 'destructive'
                        : submitVariant
                  }
                  disabled={!!buttonState.successText}
                  className="dndev-w-full"
                >
                  {buttonState.successText ||
                    buttonState.errorText ||
                    submitText ||
                    tCrud('form.submit', { defaultValue: 'Submit' })}
                </Button>
              );

              const buttonCount = buttons.length;

              // Single button: use Stack
              if (buttonCount === 1) {
                return (
                  <Stack
                    direction="column"
                    gap="tight"
                    style={buttonContainerStyle}
                  >
                    {buttons[0]}
                  </Stack>
                );
              }

              // Multiple buttons: responsive stacked on mobile, proportional on tablet+
              const colTemplate =
                buttonCount === 2
                  ? '1fr 2fr' // Cancel/Preview + Submit
                  : buttonCount === 3
                    ? '1fr 1fr 2fr' // Cancel + Preview + Submit
                    : '1fr 1fr 1fr 2fr'; // Cancel + Preview + Secondary + Submit

              return (
                <Grid
                  cols={['1fr', colTemplate, colTemplate, colTemplate]}
                  gap="tight"
                  style={buttonContainerStyle}
                >
                  {buttons}
                </Grid>
              );
            })()}
          </form>
        </div>
      </UploadProvider>
    </FormProvider>
  );
}

export default EntityFormRenderer;
