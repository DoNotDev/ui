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

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { FormProvider, useWatch } from 'react-hook-form';
import type { Control, FieldValues, Path, PathValue } from 'react-hook-form';

import {
  Alert,
  Badge,
  Button,
  DropdownMenu,
  Grid,
  Stack,
  Spinner,
} from '@donotdev/components';
import { hasRoleAccess, useTranslation } from '@donotdev/core';
import type {
  AnyEntity,
  EntityFormRendererProps,
  FieldOperation,
  FormValues,
  Visibility,
} from '@donotdev/core';
import type { EntityFormState } from '@donotdev/crud';

import { useNavigate } from '../../routing';
import { useAuthSafe } from '../../utils/useAuthSafe';
import {
  isCrudModuleAvailable,
  DisplayFieldRenderer,
  FormFieldRenderer,
  UploadProvider,
  useEntityForm,
  useFormStore,
  useFormError,
  useFieldConditions,
  translateFieldLabel,
} from '../crudImports';
import { referencePrefillFromQuery } from './entityParent';
import { useRecordBreadcrumb } from './useRecordBreadcrumb';

export type { EntityFormRendererProps };

const errorSummaryStyle = { gridColumn: '1 / -1', width: '100%' };

// RHF root errors may be a single message or named server errors.
function rootErrorMessages(error: unknown): string[] {
  if (!error || typeof error !== 'object') return [];
  return Object.entries(error).flatMap(([key, value]) => {
    if (key === 'message' && typeof value === 'string') return [value];
    if (key === 'ref' || key === 'types') return [];
    return rootErrorMessages(value);
  });
}

/**
 * Read-only field the form writes (`editable: 'computed'`, or an input disabled
 * by a condition).
 *
 * Subscribes to the field's live form value rather than reading the initial
 * `defaultValues`, so fields written during the session — a computed value set
 * by another field's component via `setValue`, for instance — display what the
 * form will actually submit, not what it was loaded with.
 *
 * Mirrors FormFieldRenderer's contract: takes `control`, subscribes itself.
 */
function FormDisplayField<
  TFieldValues extends FieldValues,
  TTransformedValues,
>({
  name,
  config,
  control,
  t,
}: {
  name: string;
  config: Parameters<typeof DisplayFieldRenderer>[0]['config'];
  control: Control<TFieldValues, unknown, TTransformedValues>;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  // why: renderable field names are the entity's own field names
  const value = useWatch({ control, name: name as Path<TFieldValues> });
  return (
    <DisplayFieldRenderer name={name} config={config} value={value} t={t} />
  );
}

/**
 * Value of a field in the stored row (`form.record`): an extension field
 * (`offer.price`) reads the extension row under its key.
 */
function recordValue(record: Record<string, unknown> | undefined, name: string): unknown {
  const dot = name.indexOf('.');
  if (dot === -1) return record?.[name];
  const nested = record?.[name.slice(0, dot)];
  return typeof nested === 'object' && nested !== null
    ? (nested as Record<string, unknown>)[name.slice(dot + 1)]
    : undefined;
}

/**
 * EntityFormRenderer - Dumb component that renders a form from entity definition.
 *
 * All orchestration (uploads, validation, status tracking) is handled by useEntityForm.
 * This component just:
 * - Generates formId
 * - Renders fields
 * - Renders submit button with status from useEntityForm
 * - Submits through `onSubmit`, or, without it, useEntityForm's default writer
 *   (the record plus the child rows joined to the form, one `bulkAcross`)
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
export function EntityFormRenderer<
  E extends AnyEntity,
  Op extends FieldOperation = FieldOperation,
>(props: EntityFormRendererProps<E, Op>) {
  const { instanceKey, ...rest } = props;
  return <EntityFormRendererCore<E, Op> key={instanceKey} {...rest} />;
}

function EntityFormRendererCore<
  E extends AnyEntity,
  Op extends FieldOperation = FieldOperation,
>({
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
  operation: operationProp,
  formId: externalFormId,
  cancelText,
  cancelPath,
  successPath,
  onCancel,
  hideVisibilityInfo = false,
}: Omit<EntityFormRendererProps<E, Op>, 'instanceKey'>) {
  // Safe guard: isCrudModuleAvailable is a module-level constant (immutable after load).
  // Hooks below are either ALL called or NONE — no Rules-of-Hooks violation at runtime.

  if (!isCrudModuleAvailable) return null;

  // why: without the prop, Op is FieldOperation (both operations), so the runtime
  // default ('edit' with defaultValues, else 'create') is an Op
  const operation = (operationProp ?? (defaultValues ? 'edit' : 'create')) as Op;

  // What the form submits: the fields it writes (the resolver's output), the
  // type onSubmit / onSecondarySubmit receive
  type EntityData = FormValues<E, Op>;
  // Form state (React Hook Form's field values): both operations
  type EntityState = EntityFormState<E>;

  const navigate = useNavigate();

  // Auto-detect role from auth; prop overrides (e.g. View-As preview)
  const authRole = useAuthSafe('userRole');
  const viewerRole = viewerRoleProp ?? authRole;

  // Deterministic form ID: it also keys the auto-saved draft, so it must survive reloads.
  // Several forms of the same entity on one page pass their own formId.
  const formId = externalFormId ?? `entity-form-${entity.name}`;

  // Entity + crud namespaces so translateLabel can resolve crud:status.* etc.
  const { t: translationFn } = useTranslation([entity.namespace, 'crud']);
  const { t: tCrud } = useTranslation('crud');
  const translate = t || translationFn;

  // Visibility badges (developer-facing) are for admins/super only
  const isAdminOrSuper = viewerRole === 'admin' || viewerRole === 'super';
  const showVisibilityBadges = !hideVisibilityInfo && isAdminOrSuper;

  // Preview dropdown (View As) is available for user/admin/super, hidden with the badges
  const canPreviewRole =
    !hideVisibilityInfo &&
    (viewerRole === 'user' || viewerRole === 'admin' || viewerRole === 'super');

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

  // Breadcrumb shows the edited record's name instead of its id
  useRecordBreadcrumb(
    entity,
    operation === 'edit'
      ? (defaultValues as Record<string, unknown> | undefined)
      : undefined
  );

  // useEntityForm handles all orchestration
  const form = useEntityForm(entity, {
    formId,
    operation,
    defaultValues,
    viewerRole,
    t: translate,
    loading,
    successPath,
  });

  const {
    control,
    setValue,
    handleSubmit,
    fields: rawFields,
    formStatus,
    uploadProgress,
    isDirty,
    hasUserInteracted,
    resetForm,
  } = form;

  const submissionError = useFormError(formId);
  const { errors, submitCount } = form.formState;
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  // RHF keeps only the fields that have an error (cleared ones are unset)
  const errorFields = Object.keys(errors).filter((name) => name !== 'root');
  const rootMessages = rootErrorMessages(errors.root);
  const hasErrors =
    errorFields.length > 0 || rootMessages.length > 0 || !!submissionError;

  const previousFeedback = useRef({ submitCount: 0, rootKey: '', submissionError: null as string | null });
  const rootKey = JSON.stringify(rootMessages);
  useEffect(() => {
    const previous = previousFeedback.current;
    previousFeedback.current = { submitCount, rootKey, submissionError };
    // Blur/condition revalidation may update errors while the user is editing.
    // Announce them inline, but move focus only for a submit or a new root failure.
    const submitted = submitCount > previous.submitCount;
    const rootFailure =
      (rootKey !== previous.rootKey && rootKey !== '[]') ||
      (!!submissionError && submissionError !== previous.submissionError);
    if (!submitted && !rootFailure) return;

    const summary = summaryRef.current;
    const formElement = formRef.current;
    if (!summary || !formElement) return;

    // The orchestrator owns actionable field focus. Only focus the summary when
    // there is no mounted, focusable invalid control in THIS form (e.g. a hidden
    // field or a server/root error), including inside a Sheet's scroll container.
    const invalidNames = Object.keys(errors).filter((name) => name !== 'root');
    const hasActionableError = Array.from(
      formElement.querySelectorAll<HTMLElement>(
        'input, textarea, select, button, [tabindex]'
      )
    ).some((control) => {
      const name = control.getAttribute('name');
      const invalid =
        control.getAttribute('aria-invalid') === 'true' ||
        (name !== null &&
          invalidNames.some(
            (field) => name === field || name.startsWith(`${field}.`)
          ));
      if (
        !invalid ||
        control.matches(':disabled, input[type="hidden"]') ||
        control.closest('[hidden], [inert], [aria-hidden="true"]') ||
        control.getClientRects().length === 0
      ) {
        return false;
      }
      for (
        let element: HTMLElement | null = control;
        element;
        element = element.parentElement
      ) {
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (element === formElement) break;
      }
      return true;
    });
    if (hasActionableError) return;
    summary.focus({ preventScroll: true });
    summary.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [errors, submitCount, submissionError, rootKey]);

  const isDirtyForBlocking = isDirty && hasUserInteracted;

  // Create: prefill reference fields named in the URL (`?brandId=…`, from a nested
  // EntityList's add button). After mount, client-only (no Suspense / hydration
  // impact on SSR pages); runs after draft restore, so the URL parent wins.
  const prefilled = useRef(false);
  useEffect(() => {
    if (operation !== 'create' || prefilled.current) return;
    prefilled.current = true;
    const prefill = referencePrefillFromQuery(
      entity,
      new URLSearchParams(window.location.search),
      viewerRole
    );
    for (const [field, value] of Object.entries(prefill)) {
      // why: prefill keys are reference fields the form writes on create
      // (referencePrefillFromQuery), values record ids
      setValue(
        field as Path<EntityState>,
        value as PathValue<EntityState, Path<EntityState>>
      );
    }
  }, [operation, entity, viewerRole, setValue]);

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

  // onSubmit receives the written fields (FormValues), not the whole row
  // No try/catch here — errors MUST propagate to useEntityForm's orchestrator
  // which properly calls setError() and does NOT clearDraft/reset.
  // Leaving on save (successPath) is useEntityForm's job: it leaves before the
  // write and returns on rejection.
  // Without onSubmit, useEntityForm's default writer saves the record and the
  // child rows joined to this form (nested EntityList on this record).
  const handleFormSubmit = onSubmit
    ? async (data: EntityData) => {
        await onSubmit(data);
      }
    : undefined;

  // Determine if cancel button should show
  // Show by default, hide only if cancelText is explicitly null
  const showCancelButton = cancelText !== null;
  const cancelButtonText =
    cancelText ?? tCrud('form.cancel');

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
              })
            : tCrud('form.processing'),
        progress: uploadProgress,
      };
    }
    if (formStatus === 'validating') {
      return {
        loading: true,
        loadingText: tCrud('form.validating'),
      };
    }
    if (formStatus === 'submitting') {
      return {
        loading: true,
        loadingText: tCrud('form.saving'),
      };
    }
    if (formStatus === 'success') {
      return {
        loading: false,
        successText: tCrud('form.saved'),
      };
    }
    if (formStatus === 'error') {
      return {
        loading: false,
        errorText: tCrud('form.error'),
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
            ref={formRef}
            id={formId}
            onSubmit={(e) => {
              // The orchestrator records failure and preserves the draft before
              // rethrowing. Consume only the final DOM event promise, never the
              // consumer callback's rejection (which must remain a failure).
              void handleSubmit(handleFormSubmit)(e).catch(() => {});
            }}
            noValidate
            className={className}
            style={{ width: '100%', gridColumn: '1 / -1', display: 'contents' }}
          >
            {hasErrors && (
              <div
                ref={summaryRef}
                tabIndex={-1}
                aria-label={tCrud('form.error')}
                style={errorSummaryStyle}
              >
                <Alert
                  variant="error"
                  title={tCrud(
                    errorFields.length > 0 ? 'form.validationFailed' : 'form.error'
                  )}
                >
                  {errorFields.length > 0 && (
                    <p>
                      {tCrud('form.fixFields', {
                        fields: errorFields
                          .map((name) =>
                            translateFieldLabel(name, entity.fields[name], translate)
                          )
                          .join(', '),
                      })}
                    </p>
                  )}
                  {rootMessages.map((message, index) => (
                    <p key={index}>{translate(message)}</p>
                  ))}
                  {submissionError && <p>{translate(submissionError)}</p>}
                </Alert>
              </div>
            )}
            {/* Render fields */}
            {renderableFields.map(({ name, config, editable, written }) => {
              // Evaluate dynamic conditions for this field
              const cond = fieldConditions[name];
              if (cond && !cond.visible) return null;

              // Apply condition overrides to field config
              const effectiveConfig = cond && config.conditions?.required !== undefined
                ? {
                    ...config,
                    // An explicit condition overrides static required in BOTH directions.
                    validation: { ...config.validation, required: cond.required },
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
              // Read-only: a field the form writes from form state (computed, or an
              // input disabled by a condition), any other from the stored row
              // (technical, editable: false, role-denied: never in form state).
              const fieldElement = !effectiveEditable ? (
                written ? (
                  <FormDisplayField
                    key={name}
                    name={name}
                    config={effectiveConfig}
                    control={control}
                    t={translate}
                  />
                ) : (
                  <DisplayFieldRenderer
                    key={name}
                    name={name}
                    config={effectiveConfig}
                    value={recordValue(form.record, name)}
                    t={translate}
                  />
                )
              ) : (
                <FormFieldRenderer
                  key={name}
                  name={name}
                  config={effectiveConfig}
                  control={control}
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
                    intent="cancel"
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
                        intent="preview"
                        variant={previewVariant}
                        disabled={buttonState.loading}
                        className="dndev-w-full"
                      >
                        {tCrud('visibility.preview')}
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
                        // why: form state is typed for both operations (EntityFormState); at
                        // runtime it is the projection for this form's Op (the fields it
                        // writes), the shape onSubmit receives, not validated.
                        const currentValues = form.getValues() as EntityData;
                        onSecondarySubmit(currentValues);
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
                  intent="save"
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
                    tCrud('form.submit')}
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
