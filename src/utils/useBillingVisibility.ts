// packages/ui/src/utils/useBillingVisibility.ts

/**
 * @fileoverview useBillingVisibility Hook
 * @description Determines when to show/hide billing UI based on feature status
 *
 * This hook encapsulates the common pattern for billing UI visibility:
 * - Hide if not available (not installed/configured)
 * - Show with loading state during initialization
 * - Show normal UI when status === 'ready'
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useAuthSafe } from './useAuthSafe';
import { useStripeBillingSafe } from './useStripeBillingSafe';

/** Return value of the useBillingVisibility hook. */
export interface BillingVisibilityState {
  /**
   * True if billing UI should be completely hidden (not available)
   */
  shouldHide: boolean;

  /**
   * True if billing is in loading state (but UI should still be visible with spinner)
   */
  isLoading: boolean;

  /**
   * True if billing is available (ready to show UI)
   */
  isReady: boolean;
}

/**
 * Hook to determine billing UI visibility and loading states
 *
 * **Visibility Rules:**
 * - Hide if `!isAvailable` (not installed/configured)
 * - Show with loading if `status === 'initializing'` during operations
 * - Show normal UI when `isAvailable && status === 'ready'`
 *
 * @returns BillingVisibilityState with visibility flags
 *
 * @example
 * ```typescript
 * const { shouldHide, isLoading, isReady } = useBillingVisibility();
 *
 * if (shouldHide) {
 *   return <FeatureDisabled featureName="Billing" />;
 * }
 *
 * if (isLoading) {
 *   return <Button disabled><Spinner /></Button>;
 * }
 *
 * return <BillingForm />;
 * ```
 */
export function useBillingVisibility(): BillingVisibilityState {
  // Get auth state for billing (required for isAvailable to work)
  const user = useAuthSafe('user');
  const status = useAuthSafe('status');
  const authState = { user, status };

  const billingStatus = useStripeBillingSafe('status', authState);
  const isAvailable = useStripeBillingSafe('isAvailable', authState);

  const shouldHide = !isAvailable;
  const isLoading = billingStatus === 'initializing';
  const isReady = isAvailable && billingStatus === 'ready';

  return {
    shouldHide,
    isLoading,
    isReady,
  };
}
