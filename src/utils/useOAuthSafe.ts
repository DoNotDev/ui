// packages/ui/src/utils/useOAuthSafe.ts

/**
 * @fileoverview Safe useOAuth wrapper for graceful degradation
 * @description Provides OAuth functionality when @donotdev/oauth is installed,
 * gracefully degrades to no-op when not installed.
 *
 * ## CRITICAL: DO NOT USE DYNAMIC IMPORTS
 *
 * This file MUST use sync `import * as oauthModule from '@donotdev/oauth'`
 * at module level. DO NOT refactor to use async `import('@donotdev/oauth').then(...)`.
 *
 * ### Why sync import is required:
 *
 * 1. **Bundler aliasing**: Vite/webpack alias missing packages to empty modules
 *    at BUILD TIME. The import completes immediately (no async).
 *
 * 2. **Rules of Hooks**: If we use async dynamic import:
 *    - First render: `realUseOAuth = null` → uses stub (0 hooks)
 *    - Async completes: `realUseOAuth = useOAuth` → now has hooks
 *    - Next render: React sees different hook count → CRASH
 *
 * 3. **Monorepo gotcha**: Dynamic imports resolve workspace packages even when
 *    the consuming app doesn't have them as dependencies. This causes the
 *    real hook to activate unexpectedly → Rules of Hooks violation.
 *
 * 4. **Decision is immutable**: With sync import, `oauthModule?.useOAuth`
 *    is evaluated ONCE at module load. It's either the real hook or undefined.
 *    This never changes during the app lifecycle.
 *
 * @see docs/development/GRACEFUL_DEGRADATION.md
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { OAuthAPI } from '@donotdev/core';
import { DEGRADED_OAUTH_API } from '@donotdev/core';
import * as oauthModule from '@donotdev/oauth';

// Check if real hook exists (will be undefined if Vite aliased to empty module)
const realUseOAuth = oauthModule?.useOAuth as
  | (<K extends keyof OAuthAPI>(key: K) => OAuthAPI[K])
  | undefined;

/**
 * Stub that returns degraded OAuth values.
 * Used when @donotdev/oauth is not installed.
 */
function useOAuthStub<K extends keyof OAuthAPI>(key: K): OAuthAPI[K] {
  return DEGRADED_OAUTH_API[key];
}

/**
 * Safe wrapper for useOAuth hook.
 *
 * - If @donotdev/oauth installed → uses real hook (handles credentials/consent internally)
 * - If not installed → returns degraded API values
 *
 * @param key - Property name to access from OAuth API
 * @returns The OAuth API value, or degraded value if OAuth unavailable
 *
 * @example
 * ```typescript
 * const connect = useOAuthSafe('connect');
 * const loading = useOAuthSafe('loading');
 * const isAvailable = useOAuthSafe('isAvailable');
 * ```
 */
export function useOAuthSafe<K extends keyof OAuthAPI>(key: K): OAuthAPI[K] {
  if (realUseOAuth) {
    return realUseOAuth(key);
  }
  return useOAuthStub(key);
}

/**
 * Check if OAuth module is available (for conditional UI rendering)
 */
export const isOAuthAvailable = typeof realUseOAuth === 'function';
