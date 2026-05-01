// packages/ui/src/utils/useAISafe.ts

/**
 * @fileoverview Safe useAI wrapper for graceful degradation
 * @description Provides AI functionality when @donotdev/ai is installed,
 * gracefully degrades to no-op when not installed.
 *
 * ## CRITICAL: DO NOT USE DYNAMIC IMPORTS
 * @see useStripeBillingSafe.ts for full explanation of why sync imports are required.
 *
 * @version 0.1.0
 * @since 0.1.0
 * @author AMBROISE PARK Consulting
 */

import * as aiModule from '@donotdev/ai';
import type { AIAuthState } from '@donotdev/ai';
import type { AIAPI } from '@donotdev/core';
import { DEGRADED_AI_API } from '@donotdev/core';

// Re-export AIAuthState for consumers
export type { AIAuthState } from '@donotdev/ai';

// Check if real hook exists (will be undefined if Vite aliased to empty module)
const realUseAI = aiModule?.useAI as
  | (<K extends keyof AIAPI>(key: K, authState?: AIAuthState) => AIAPI[K])
  | undefined;

/**
 * Stub that returns degraded AI values.
 * Used when @donotdev/ai is not installed.
 */
function useAIStub<K extends keyof AIAPI>(key: K): AIAPI[K] {
  return DEGRADED_AI_API[key];
}

/**
 * Safe wrapper for useAI hook.
 *
 * - If @donotdev/ai installed -> uses real hook
 * - If not installed -> returns degraded API values
 *
 * @param key - Property name to access from AI API
 * @param authState - Auth state from useAIAuth or useAuthSafe
 * @returns The AI API value, or degraded value if AI unavailable
 *
 * @example
 * ```typescript
 * const authState = useAIAuth();
 * const append = useAISafe('append', authState);
 * const messages = useAISafe('messages', authState);
 * const isLoading = useAISafe('isLoading', authState);
 * const cost = useAISafe('cost', authState);
 * ```
 */
export function useAISafe<K extends keyof AIAPI>(
  key: K,
  authState?: AIAuthState
): AIAPI[K] {
  if (realUseAI) {
    return realUseAI(key, authState);
  }
  return useAIStub(key);
}

/**
 * Check if AI module is available (for conditional UI rendering)
 */
export const isAIAvailable = typeof realUseAI === 'function';
