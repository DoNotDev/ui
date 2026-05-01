// packages/ui/src/utils/useStripeBillingSafe.ts

/**
 * @fileoverview Safe useStripeBilling wrapper for graceful degradation
 * @description Provides billing functionality when @donotdev/billing is installed,
 * gracefully degrades to no-op when not installed.
 *
 * ## CRITICAL: DO NOT USE DYNAMIC IMPORTS
 *
 * This file MUST use sync `import * as billingModule from '@donotdev/billing'`
 * at module level. DO NOT refactor to use async `import('@donotdev/billing').then(...)`.
 *
 * ### Why sync import is required:
 *
 * 1. **Bundler aliasing**: Vite/webpack alias missing packages to empty modules
 *    at BUILD TIME. The import completes immediately (no async).
 *
 * 2. **Rules of Hooks**: If we use async dynamic import:
 *    - First render: `realUseStripeBilling = null` → uses stub (0 hooks)
 *    - Async completes: `realUseStripeBilling = useStripeBilling` → now has hooks
 *    - Next render: React sees different hook count → CRASH
 *
 * 3. **Monorepo gotcha**: Dynamic imports resolve workspace packages even when
 *    the consuming app doesn't have them as dependencies. This causes the
 *    real hook to activate unexpectedly → Rules of Hooks violation.
 *
 * 4. **Decision is immutable**: With sync import, `billingModule?.useStripeBilling`
 *    is evaluated ONCE at module load. It's either the real hook or undefined.
 *    This never changes during the app lifecycle.
 *
 * @see docs/development/GRACEFUL_DEGRADATION.md
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import * as billingModule from '@donotdev/billing';
import type { BillingAuthState } from '@donotdev/billing';
import type { BillingAPI } from '@donotdev/core';
import { DEGRADED_BILLING_API } from '@donotdev/core';

// Re-export BillingAuthState for consumers
export type { BillingAuthState } from '@donotdev/billing';

// Check if real hook exists (will be undefined if Vite aliased to empty module)
const realUseStripeBilling = billingModule?.useStripeBilling as
  | (<K extends keyof BillingAPI>(
      key: K,
      authState?: BillingAuthState
    ) => BillingAPI[K])
  | undefined;

/**
 * Stub that returns degraded billing values.
 * Used when @donotdev/billing is not installed.
 */
function useStripeBillingStub<K extends keyof BillingAPI>(
  key: K
): BillingAPI[K] {
  return DEGRADED_BILLING_API[key];
}

/**
 * Safe wrapper for useStripeBilling hook.
 *
 * - If @donotdev/billing installed → uses real hook
 * - If not installed → returns degraded API values
 *
 * **IMPORTANT:** For `isAvailable` to return `true`, you must pass `authState`.
 * Without auth state, billing will return `isAvailable: false` until auth status is `ready`.
 *
 * @param key - Property name to access from billing API
 * @param authState - Auth state from useAuthSafe (user, status)
 * @returns The billing API value, or degraded value if billing unavailable
 *
 * @example
 * ```typescript
 * // Get auth state first
 * const user = useAuthSafe('user');
 * const status = useAuthSafe('status'); // 'initializing' | 'ready' | 'degraded' | 'error'
 * const authState = { user, status };
 *
 * // Pass to billing
 * const checkout = useStripeBillingSafe('checkout', authState);
 * const billingStatus = useStripeBillingSafe('status', authState);
 * const isAvailable = useStripeBillingSafe('isAvailable', authState);
 * ```
 */
export function useStripeBillingSafe<K extends keyof BillingAPI>(
  key: K,
  authState?: BillingAuthState
): BillingAPI[K] {
  if (realUseStripeBilling) {
    return realUseStripeBilling(key, authState);
  }
  return useStripeBillingStub(key);
}

/**
 * Check if billing module is available (for conditional UI rendering)
 */
export const isBillingAvailable = typeof realUseStripeBilling === 'function';
