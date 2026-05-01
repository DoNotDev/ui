// packages/ui/src/utils/useAuthVisibility.ts

/**
 * @fileoverview useAuthVisibility Hook
 * @description Determines when to show/hide auth UI based on feature status
 *
 * This hook encapsulates the common pattern for auth UI visibility:
 * - Hide if status !== 'ready' or not available (not ready yet)
 * - Show with loading state during initialization
 * - Show normal UI when status === 'ready'
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useMemo } from 'react';

import { useAuthSafe } from './useAuthSafe';

/** Return value of the useAuthVisibility hook. */
export interface AuthVisibilityState {
  /**
   * True if auth UI should be completely hidden (not initialized or not available)
   */
  shouldHide: boolean;

  /**
   * True if auth is in loading state (but UI should still be visible with spinner)
   */
  isLoading: boolean;

  /**
   * True if auth is initialized and available (ready to show UI)
   */
  isReady: boolean;

  /**
   * True if user is authenticated
   */
  isAuthenticated: boolean;
}

/**
 * Hook to determine auth UI visibility and loading states
 *
 * **Visibility Rules:**
 * - Hide if `status !== 'ready' || !isAvailable` (not ready or not installed)
 * - Show with loading if `status === 'initializing'` during operations
 * - Show normal UI when `status === 'ready' && isAvailable`
 *
 * @returns AuthVisibilityState with visibility flags
 *
 * @example
 * ```typescript
 * const { shouldHide, isLoading, isReady, isAuthenticated } = useAuthVisibility();
 *
 * if (shouldHide) return null;
 *
 * if (isLoading) {
 *   return <Button disabled><Spinner /></Button>;
 * }
 *
 * if (isAuthenticated) {
 *   return <UserMenu />;
 * }
 *
 * return <SignInButton />;
 * ```
 */
export function useAuthVisibility(): AuthVisibilityState {
  // Read all values first - each triggers subscription
  const status = useAuthSafe('status');
  const isAvailable = useAuthSafe('isAvailable');
  const user = useAuthSafe('user');

  // Derive all visibility state atomically from current values
  // useMemo ensures consistent state within a single render
  return useMemo(() => {
    const shouldHide = status !== 'ready' || !isAvailable;
    const isLoading = status === 'initializing';
    const isReady = status === 'ready' && isAvailable;
    const isAuthenticated = Boolean(user);

    return {
      shouldHide,
      isLoading,
      isReady,
      isAuthenticated,
    };
  }, [status, isAvailable, user]);
}
