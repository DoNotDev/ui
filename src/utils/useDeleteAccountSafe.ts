// packages/ui/src/utils/useDeleteAccountSafe.ts

/**
 * @fileoverview Safe useDeleteAccount wrapper for graceful degradation
 * @description Provides the account deletion flow when @donotdev/auth is installed,
 * degrades to a no-op state when not installed.
 *
 * ## CRITICAL: DO NOT USE DYNAMIC IMPORTS
 *
 * Same contract as `useAuthSafe`: sync `import * as authModule` at module level.
 * The branch (real hook vs stub) is decided ONCE at module load and never changes,
 * so the hook count per render is stable (Rules of Hooks).
 *
 * @see ./useAuthSafe.ts
 * @see docs/development/GRACEFUL_DEGRADATION.md
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */

import * as authModule from '@donotdev/auth';
import type { DeleteAccountState } from '@donotdev/auth';

// Undefined if package not installed/aliased to empty module
const realUseDeleteAccount: (() => DeleteAccountState) | undefined =
  authModule?.useDeleteAccount;

const NOOP = () => {};

/** Inert deletion state used when @donotdev/auth is not installed. */
const DEGRADED_DELETE_ACCOUNT_STATE: DeleteAccountState = {
  showConfirmDialog: false,
  showPasswordDialog: false,
  isDeleting: false,
  error: null,
  startDeleteFlow: NOOP,
  confirmDelete: async () => {},
  cancel: NOOP,
};

/**
 * Safe wrapper for `useDeleteAccount`.
 *
 * - If @donotdev/auth installed → real hook (confirm / reauth / delete flow)
 * - If not installed → inert state, no-op actions
 *
 * @returns Account deletion state and actions
 *
 * @example
 * ```typescript
 * const deletion = useDeleteAccountSafe();
 * deletion.startDeleteFlow();
 * ```
 */
export function useDeleteAccountSafe(): DeleteAccountState {
  if (realUseDeleteAccount) {
    return realUseDeleteAccount();
  }
  return DEGRADED_DELETE_ACCOUNT_STATE;
}
