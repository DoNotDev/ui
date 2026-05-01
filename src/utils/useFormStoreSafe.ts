// packages/ui/src/utils/useFormStoreSafe.ts

/**
 * @fileoverview Safe FormStore access for graceful degradation
 * @description Provides FormStore functionality when @donotdev/crud is installed,
 * gracefully degrades when not installed.
 *
 * ## CRITICAL: DO NOT USE DYNAMIC IMPORTS
 *
 * This file MUST use sync `import * as crudModule from '@donotdev/crud'`
 * at module level. DO NOT refactor to use async `import('@donotdev/crud').then(...)`.
 *
 * @see packages/ui/src/utils/useAuthSafe.ts for pattern reference
 * @see docs/development/GRACEFUL_DEGRADATION.md
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import * as crudModule from '@donotdev/crud';

// Sync import - bundler aliases to empty module if not installed
// Decision made ONCE at module load time, never changes

/**
 * Degraded FormStore state - returned when CRUD package not installed
 * Matches FormStoreState & FormStoreActions interface
 */
const DEGRADED_FORM_STORE_STATE = {
  forms: {},
  // State transitions (no-ops)
  startSubmit: () => {},
  setUploading: () => {},
  setValidating: () => {},
  setSubmitting: () => {},
  setSuccess: () => {},
  setError: () => {},
  reset: () => {},
  cleanup: () => {},
  // Dirty state management
  setIsDirty: (_formId: string, _isDirty: boolean) => {},
  hasDirtyForms: () => false,
  getDirtyFormIds: () => [] as string[],
  // Getters
  getStatus: () => 'idle' as const,
  isLoading: () => false,
  getUploadProgress: () => 0,
  getError: () => null,
  getIsDirty: () => false,
} as const;

/** Minimal shape shared between the real FormStore state and the degraded fallback */
type FormStoreLike = typeof DEGRADED_FORM_STORE_STATE;

// Extract useFormStore if available (undefined if package not installed/aliased)
// Zustand stores have both the hook and getState method
const realUseFormStore = crudModule?.useFormStore as unknown as
  | ((<T>(selector: (state: FormStoreLike) => T) => T) & {
      getState: () => FormStoreLike;
    })
  | undefined;

/**
 * Check if FormStore is available
 */
export const isFormStoreAvailable = typeof realUseFormStore === 'function';

/**
 * Safe access to FormStore.
 * Returns degraded state selector result if CRUD package not installed.
 *
 * @param selector - Zustand selector function
 * @returns Selected state, or degraded state selection if CRUD not available
 *
 * @example
 * ```tsx
 * const hasDirtyForms = useFormStoreSafe((state) => state.hasDirtyForms());
 * // Always safe to call - returns false when degraded
 * ```
 */
export function useFormStoreSafe<T>(selector: (state: FormStoreLike) => T): T {
  if (realUseFormStore) {
    return realUseFormStore(selector);
  }
  return selector(DEGRADED_FORM_STORE_STATE);
}

/**
 * Get FormStore state directly (non-hook version).
 * Use this in non-React contexts or for one-time checks.
 *
 * @returns FormStore state, or degraded state if CRUD not available
 */
useFormStoreSafe.getState = (): typeof DEGRADED_FORM_STORE_STATE => {
  if (realUseFormStore && typeof realUseFormStore.getState === 'function') {
    return realUseFormStore.getState();
  }
  return DEGRADED_FORM_STORE_STATE;
};
