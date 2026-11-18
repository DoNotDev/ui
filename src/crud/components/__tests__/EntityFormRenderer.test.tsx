// packages/ui/src/crud/components/__tests__/EntityFormRenderer.test.tsx

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useForm, useFormContext } from 'react-hook-form';
import type { FieldErrors, UseFormHandleSubmit } from 'react-hook-form';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

import { Sheet } from '@donotdev/components';
import type { AnyEntity } from '@donotdev/core';

import { FormNavigationProvider } from '../../../../../features/crud/src/forms/FormNavigation';
import { useEntityForm as useProductionEntityForm } from '../../../../../features/crud/src/forms/hooks/useEntityForm';
import { useFieldConditions } from '../../../../../features/crud/src/hooks/useFieldConditions';

import { useFormError, useFormStore } from '../../../../../features/crud/src/stores/FormStore';
import { translateFieldLabel } from '../../../../../features/crud/src/forms/utils/translateFieldLabel';

const state = vi.hoisted(() => ({
  errors: {} as FieldErrors,
  realHook: false,
  mountField: true,
  disabledField: false,
  hiddenField: false,
  navigate: vi.fn(),
  reset: vi.fn(),
}));

const messages: Record<string, string> = {
  'form.error': 'Unable to save',
  'form.validationFailed': 'Please check this form',
  'form.submit': 'Save',
  'form.saved': 'Saved',
  'product.name': 'Product name',
  'company.cgvRequired': 'Accept the terms before continuing',
  'server.unavailable': 'Service unavailable. Please try again',
  'server.root': 'The server rejected this record',
};
const translate = (key: string, options?: Record<string, unknown>) =>
  key === 'form.fixFields' ? `Correct: ${options?.fields}` : messages[key] ?? key;

vi.mock('@donotdev/core', async (orig) => ({
  ...(await orig<object>()),
  useTranslation: () => ({ t: translate }),
}));
vi.mock('../../../routing', () => ({ useNavigate: () => state.navigate }));
vi.mock('../../../utils/useAuthSafe', () => ({ useAuthSafe: () => 'admin' }));
vi.mock('../useRecordBreadcrumb', () => ({ useRecordBreadcrumb: () => {} }));
vi.mock('../../crudImports', () => ({
  isCrudModuleAvailable: true,
  DisplayFieldRenderer: ({ name, value }: { name: string; value: unknown }) => (
    <output data-testid={`display-${name}`}>{value === undefined ? '' : String(value)}</output>
  ),
  FormFieldRenderer: ({ name, config }: { name: string; config: { validation?: { required?: boolean } } }) => {
    const form = useFormContext();
    return state.mountField ? (
      <input aria-label={name} required={config.validation?.required === true} type={state.hiddenField ? 'hidden' : 'text'} disabled={state.disabledField} {...form.register(name)} />
    ) : null;
  },
  UploadProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
  // Model only the orchestrator contract: the real RHF methods + real FormStore.
  // Submission failure must reach the store and rethrow BEFORE the DOM catches it.
  useEntityForm: (entity: AnyEntity, options: Parameters<typeof useProductionEntityForm>[1]) => {
    if (state.realHook) return useProductionEntityForm(entity, options);
    const formId = options?.formId ?? '';
    const form = useForm({
      defaultValues: { name: 'Retained draft' },
      mode: 'onBlur',
      shouldFocusError: false,
      resolver: async (values) => ({
        values: Object.keys(state.errors).length ? {} : values,
        errors: state.errors,
      }),
    });
    const status = useFormStore((store) => store.forms[formId]?.status ?? 'idle');
    const handleSubmit: UseFormHandleSubmit<{ name: string }> = (onValid, onInvalid) =>
      form.handleSubmit(async (data, event) => {
        const store = useFormStore.getState();
        store.setSubmitting(formId);
        try {
          await onValid(data, event);
          state.reset();
          store.setSuccess(formId);
        } catch (error) {
          store.setError(formId, error instanceof Error ? error.message : String(error));
          throw error;
        }
      }, (errors, event) => {
        // Like the hook, focus a mounted actionable control, not a hidden ref.
        const target = event?.target;
        if (target instanceof HTMLFormElement) {
          for (const input of target.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not(:disabled)')) {
            if (!errors[input.name] || input.getClientRects().length === 0) continue;
            input.focus();
            break;
          }
        }
        onInvalid?.(errors, event);
      });
    return {
      ...form,
      handleSubmit,
      fields: [{
        name: 'name',
        config: { name: 'name', label: 'product.name', type: 'text', visibility: 'admin' },
        editable: true,
        written: true,
      }],
      formStatus: status,
      uploadProgress: 0,
      isDirty: false,
      hasUserInteracted: false,
      resetForm: state.reset,
    };
  },
  useFormStore,
  useFormError,
  translateFieldLabel,
  useFieldConditions,
}));

import { EntityFormRenderer } from '../EntityFormRenderer';
import { formProductEntity as entity, ledgerEntity, optionalFlagsEntity, requiredFlagsEntity } from '@dndev/test-entities';

const formId = 'test-product-form';
const PREVIEW = /visibility\.preview/;

beforeEach(() => {
  state.errors = {};
  state.realHook = false;
  state.mountField = true;
  state.disabledField = false;
  state.hiddenField = false;
  vi.clearAllMocks();
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  // happy-dom has no layout. Model a mounted control with a visible rect.
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(() => ({
    length: 1,
    item: () => new DOMRect(),
    [Symbol.iterator]: function* () { yield new DOMRect(); },
  }));
});
afterEach(() => {
  cleanup();
  for (const id of Object.keys(useFormStore.getState().forms)) {
    useFormStore.getState().cleanup(id);
  }
  for (const key of Object.keys(useFormStore.getState().drafts)) {
    useFormStore.getState().clearDraft(key);
  }
  vi.restoreAllMocks();
});

function submit() {
  const form = document.getElementById(formId);
  if (!(form instanceof HTMLFormElement)) throw new Error('Missing test form');
  fireEvent.submit(form);
}

// hideVisibilityInfo must hide BOTH the field badges and the View-As selector.
describe('EntityFormRenderer View-As selector', () => {
  it('shows the View-As selector and badge to an admin by default', () => {
    render(<EntityFormRenderer entity={entity} operation="create" onSubmit={vi.fn()} />);
    expect(screen.queryByText(PREVIEW)).not.toBeNull();
    expect(screen.queryByText('Admin', { selector: 'span' })).not.toBeNull();
  });

  it('hides the selector and badge with hideVisibilityInfo', () => {
    render(<EntityFormRenderer entity={entity} operation="create" onSubmit={vi.fn()} hideVisibilityInfo />);
    expect(screen.queryByText(PREVIEW)).toBeNull();
    expect(screen.queryByText('Admin', { selector: 'span' })).toBeNull();
  });
});

describe('EntityFormRenderer conditional required flags', () => {
  it.each([true, false])('overrides static required=%s in both live directions', async (required) => {
    state.realHook = true;
    const conditional = required ? requiredFlagsEntity : optionalFlagsEntity;
    render(<EntityFormRenderer entity={conditional} formId={formId} operation="create" onSubmit={vi.fn()} hideVisibilityInfo />);
    expect(screen.getByLabelText<HTMLInputElement>('name').required).toBe(false);
    fireEvent.change(screen.getByLabelText('toggle'), { target: { value: 'yes' } });
    await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>('name').required).toBe(true));
    // Having other conditions must not erase the static flag.
    expect(screen.getByLabelText<HTMLInputElement>('static').required).toBe(true);
    fireEvent.change(screen.getByLabelText('toggle'), { target: { value: 'no' } });
    await waitFor(() => expect(screen.getByLabelText<HTMLInputElement>('name').required).toBe(false));
  });
});

describe('EntityFormRenderer error feedback', () => {
  it.each([false, true])('does not steal focus for blur validation (previous submit=%s)', async (previousSubmit) => {
    render(<>
      <input aria-label="Next control" />
      <EntityFormRenderer entity={entity} formId={formId} operation="create" onSubmit={vi.fn()} hideVisibilityInfo />
    </>);
    if (previousSubmit) {
      state.errors = { name: { type: 'required', message: 'Required' } };
      submit();
      await screen.findByRole('alert');
    }
    vi.mocked(HTMLElement.prototype.scrollIntoView).mockClear();
    state.errors = { name: { type: 'validate', message: 'Changed blur error' } };
    // A zero-rect control cannot accept orchestrator focus. Even then, ordinary
    // blur must not redirect the user's focus to the fallback summary.
    vi.spyOn(screen.getByLabelText('name'), 'getClientRects').mockReturnValue({ length: 0, item: () => null, [Symbol.iterator]: function* () {} });
    const next = screen.getByLabelText('Next control');
    next.focus();
    await act(async () => { fireEvent.blur(screen.getByLabelText('name')); });
    await screen.findByText('Correct: Product name');
    expect(document.activeElement).toBe(next);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('shows translated labels and lets a later mounted invalid field keep focus', async () => {
    state.errors = {
      unmounted: { type: 'required', message: 'Required' },
      name: { type: 'required', message: 'Required' },
    };
    const onSubmit = vi.fn();
    render(<EntityFormRenderer entity={entity} formId={formId} operation="create" onSubmit={onSubmit} t={translate} hideVisibilityInfo />);
    submit();
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Correct: unmounted, Product name')).toBeTruthy();
    expect(alert.closest('form')?.id).toBe(formId);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox')));
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each(['unmounted', 'disabled', 'hidden', 'zero-rect'] as const)('focuses and scrolls the summary in a Sheet for a %s invalid field', async (kind) => {
    state.errors = { name: { type: 'required', message: 'Required' } };
    state.mountField = kind !== 'unmounted';
    state.disabledField = kind === 'disabled';
    state.hiddenField = kind === 'hidden';
    render(
      <Sheet open title="Edit product" noSwipe>
        <EntityFormRenderer entity={entity} formId={formId} operation="create" onSubmit={vi.fn()} t={translate} hideVisibilityInfo />
      </Sheet>
    );
    if (kind === 'zero-rect') {
      vi.spyOn(screen.getByLabelText('name'), 'getClientRects').mockReturnValue({ length: 0, item: () => null, [Symbol.iterator]: function* () {} });
    }
    submit();
    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(document.activeElement).toBe(alert.parentElement));
    expect(alert.closest('.dndev-sheet-body')).not.toBeNull();
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
  });

  it('renders translated RHF root errors and focuses the summary', async () => {
    state.errors = { root: { server: { type: 'server', message: 'server.root' } } };
    render(<EntityFormRenderer entity={entity} formId={formId} operation="create" onSubmit={vi.fn()} t={translate} hideVisibilityInfo />);
    submit();
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('The server rejected this record')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(alert.parentElement));
  });

  it('uses production orchestration for DOM rejection, persisted draft and successful retry inside a Sheet', async () => {
    state.realHook = true;
    const draftKey = `product-form-draft-${formId}`;
    const clearDraft = vi.spyOn(useFormStore.getState(), 'clearDraft');
    const success = vi.spyOn(useFormStore.getState(), 'setSuccess');
    const unhandled = vi.fn();
    window.addEventListener('unhandledrejection', unhandled);
    const onSubmit = vi.fn()
      .mockRejectedValueOnce(new Error(translate('company.cgvRequired')))
      .mockRejectedValueOnce(new Error('server.unavailable'))
      .mockResolvedValueOnce(undefined);
    try {
      render(
        <FormNavigationProvider value={{ navigate: state.navigate, currentPath: () => '/products/new', parentPath: () => '/products' }}>
          <Sheet open title="Edit product" noSwipe>
            <EntityFormRenderer entity={entity} formId={formId} operation="create" onSubmit={onSubmit} t={translate} successPath="/saved" hideVisibilityInfo />
          </Sheet>
        </FormNavigationProvider>
      );
      fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Keep this value' } });
      await waitFor(() => expect(useFormStore.getState().loadDraft(draftKey)?.data.name).toBe('Keep this value'), { timeout: 4000 });
      submit();
      await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
      const alert = await screen.findByRole('alert');
      expect(within(alert).getByText('Accept the terms before continuing')).toBeTruthy();
      expect(useFormStore.getState().getError(formId)).toBe('Accept the terms before continuing');
      expect(useFormStore.getState().getStatus(formId)).toBe('error');
      expect(clearDraft).not.toHaveBeenCalled();
      expect(success).not.toHaveBeenCalled();
      expect(screen.queryByText('Saved')).toBeNull();
      expect(useFormStore.getState().getIsDirty(formId)).toBe(true);
      expect(useFormStore.getState().loadDraft(draftKey)?.data.name).toBe('Keep this value');
      // Left optimistically, then returned to the form on rejection.
      expect(state.navigate.mock.calls).toEqual([['/saved'], ['/products/new']]);
      expect(screen.getByLabelText<HTMLInputElement>('name').value).toBe('Keep this value');
      await waitFor(() => expect(document.activeElement).toBe(alert.parentElement));
      expect(alert.closest('.dndev-sheet-body')).not.toBeNull();

      submit();
      expect(await screen.findByText('Service unavailable. Please try again')).toBeTruthy();
      expect(screen.queryByText('Accept the terms before continuing')).toBeNull();
      expect(clearDraft).not.toHaveBeenCalled();
      expect(success).not.toHaveBeenCalled();
      expect(useFormStore.getState().loadDraft(draftKey)?.data.name).toBe('Keep this value');
      submit();
      await waitFor(() => expect(useFormStore.getState().getStatus(formId)).toBe('success'));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(clearDraft).toHaveBeenCalledWith(draftKey);
      expect(success).toHaveBeenCalledOnce();
      expect(useFormStore.getState().loadDraft(draftKey)).toBeNull();
      expect(screen.getByRole('button', { name: 'Saved' })).toBeTruthy();
      expect(state.navigate).toHaveBeenLastCalledWith('/saved');
      expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Keep this value' }));
      // Flush remaining event microtasks; Vitest also fails on unhandled rejections.
      await act(async () => {});
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('unhandledrejection', unhandled);
    }
  });

  it('does not consult or focus invalid controls belonging to another form', async () => {
    state.mountField = false;
    state.errors = { name: { type: 'required', message: 'Required' } };
    render(<>
      <form><input name="name" aria-invalid="true" aria-label="Other name" /></form>
      <EntityFormRenderer entity={entity} formId={formId} operation="create" onSubmit={vi.fn()} t={translate} hideVisibilityInfo />
    </>);
    submit();
    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(document.activeElement).toBe(alert.parentElement));
  });
});

// Regression (design 3.6): read-only fields the form does not write are not in form
// state; they display from form.record. Computed fields display from form state.
describe('EntityFormRenderer read-only display', () => {
  const ledger = ledgerEntity;

  it('shows editable: false and technical fields from the stored row, computed from form state', () => {
    state.realHook = true;
    render(
      <EntityFormRenderer
        entity={ledger}
        formId="ledger-display"
        operation="edit"
        defaultValues={{ id: 'l1', name: 'N', code: 'C-1', total: 5, status: 'available', createdAt: '2026-11-17' }}
        onSubmit={vi.fn()}
        t={translate}
        hideVisibilityInfo
      />
    );
    expect(screen.getByTestId('display-code').textContent).toBe('C-1');
    expect(screen.getByTestId('display-total').textContent).toBe('5');
    // Technical (backend-generated): read-only from the stored row
    expect(screen.getByTestId('display-createdAt').textContent).toBe('2026-11-17');
  });
});
