// packages/ui/src/utils/useAuthSafe.ts

/**
 * @fileoverview Safe useAuth wrapper for graceful degradation
 * @description Provides auth functionality when @donotdev/auth is installed,
 * gracefully degrades to no-op when not installed.
 *
 * ## CRITICAL: DO NOT USE DYNAMIC IMPORTS
 *
 * This file MUST use sync `import * as authModule from '@donotdev/auth'`
 * at module level. DO NOT refactor to use async `import('@donotdev/auth').then(...)`.
 *
 * ### Why sync import is required:
 *
 * 1. **Bundler aliasing**: Vite/webpack alias missing packages to empty modules
 *    at BUILD TIME. The import completes immediately (no async).
 *
 * 2. **Rules of Hooks**: If we use async dynamic import:
 *    - First render: `realUseAuth = null` → uses stub (0 hooks)
 *    - Async completes: `realUseAuth = useAuth` → now has hooks
 *    - Next render: React sees different hook count → CRASH
 *
 * 3. **Monorepo gotcha**: Dynamic imports resolve workspace packages even when
 *    the consuming app doesn't have them as dependencies. This causes the
 *    real hook to activate unexpectedly → Rules of Hooks violation.
 *
 * 4. **Decision is immutable**: With sync import, `authModule?.useAuth` is
 *    evaluated ONCE at module load. It's either the real hook or undefined.
 *    This never changes during the app lifecycle.
 *
 * @see docs/development/GRACEFUL_DEGRADATION.md
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import * as authModule from '@donotdev/auth';
import type { AuthAPI } from '@donotdev/core';
import { DEGRADED_AUTH_API } from '@donotdev/core';

// Sync import - bundler aliases to empty module if not installed
// Decision made ONCE at module load time, never changes

// Extract useAuth if available (undefined if package not installed/aliased)
const realUseAuth = authModule?.useAuth as
  | (<K extends keyof AuthAPI>(key: K) => AuthAPI[K])
  | undefined;

/**
 * Stub that returns degraded auth values.
 * Used when @donotdev/auth is not installed.
 */
function useAuthStub<K extends keyof AuthAPI>(key: K): AuthAPI[K] {
  return DEGRADED_AUTH_API[key];
}

/**
 * Safe wrapper for useAuth hook.
 *
 * - If @donotdev/auth installed → uses real hook (handles Firebase/consent internally)
 * - If not installed → returns degraded API values
 *
 * @param key - Property name to access from auth API
 * @returns The auth API value, or degraded value if auth unavailable
 *
 * @example
 * ```typescript
 * const user = useAuthSafe('user');
 * const signIn = useAuthSafe('signInWithEmail');
 * const isAvailable = useAuthSafe('isAvailable');
 * ```
 */
export function useAuthSafe<K extends keyof AuthAPI>(key: K): AuthAPI[K] {
  if (realUseAuth) {
    return realUseAuth(key);
  }
  return useAuthStub(key);
}

/**
 * Check if auth module is available (for conditional UI rendering)
 */
export const isAuthAvailable = typeof realUseAuth === 'function';

/**
 * PasswordResetCallback - auto-overlay for password reset flow.
 * Renders nothing if @donotdev/auth not installed or no reset in progress.
 */
export const PasswordResetCallback =
  authModule?.PasswordResetCallback ?? (() => null);
