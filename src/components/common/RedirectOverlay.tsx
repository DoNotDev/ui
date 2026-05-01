'use client';
// packages/ui/src/components/common/RedirectOverlay.tsx

/**
 * @fileoverview RedirectOverlay component
 * @description Industry-standard fullscreen overlay for redirect operations (payments, OAuth, etc.).
 * Features phase-based progress, 10s cancel timeout, i18n support, and browser event handling.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Lock, Shield } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';

import { Portal, Spinner, Stack, Text, Button } from '@donotdev/components';
import {
  useTranslation,
  useOverlay,
  type RedirectOverlayPhase,
} from '@donotdev/core';

/** Phase progression timings (ms from start) */
const PHASE_TIMINGS = {
  connecting: 0,
  preparing: 2000,
  redirecting: 5000,
} as const;

/** Default timeout before showing cancel button (10 seconds) */
const DEFAULT_CANCEL_TIMEOUT = 10000;

/**
 * Get icon component based on operation type
 */
function getOperationIcon(
  operation: string | null,
  configIcon?: 'lock' | 'shield' | 'none'
) {
  if (configIcon === 'none') return null;
  if (configIcon === 'shield') return Shield;
  if (configIcon === 'lock') return Lock;

  // Infer from operation
  if (!operation) return Lock;
  if (
    operation.startsWith('stripe-') ||
    operation.includes('payment') ||
    operation.includes('checkout')
  ) {
    return Lock;
  }
  if (operation.startsWith('oauth-') || operation.startsWith('auth-')) {
    return Shield;
  }
  return Lock;
}

/**
 * Get i18n key for operation
 */
function getOperationKey(operation: string | null): string {
  if (!operation) return 'default';
  // Check if operation has a specific translation, otherwise use default
  return operation;
}

/**
 * RedirectOverlay - Industry-standard redirect overlay with phase progression
 *
 * Features:
 * - Phase-based progress: connecting → preparing → redirecting → timeout
 * - Cancel button appears after 10s (configurable)
 * - i18n support with operation-specific messaging
 * - Browser event handling (popstate, visibilitychange)
 * - Accessible (ARIA labels, role="status")
 * - RTL-safe styling
 *
 * @example
 * ```tsx
 * // Include once in app root (layout.tsx or App.tsx)
 * import { RedirectOverlay } from '@donotdev/ui';
 *
 * function RootLayout({ children }) {
 *   return (
 *     <>
 *       {children}
 *       <RedirectOverlay />
 *     </>
 *   );
 * }
 *
 * // Hooks trigger it automatically
 * const checkout = useStripeBilling('checkout', authState);
 * await checkout({ priceId: 'price_123' }); // Shows overlay automatically
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function RedirectOverlay() {
  const { t } = useTranslation('dndev');

  // Subscribe to overlay store
  const isOpen = useOverlay('isRedirectOverlayOpen');
  const operation = useOverlay('redirectOperation');
  const phase = useOverlay('redirectPhase');
  const showCancelButton = useOverlay('showCancelButton');
  const config = useOverlay('redirectConfig');
  const startTime = useOverlay('redirectStartTime');

  // Actions
  const setRedirectPhase = useOverlay('setRedirectPhase');
  const setShowCancelButton = useOverlay('setShowCancelButton');
  const hideRedirectOverlay = useOverlay('hideRedirectOverlay');

  // Refs for cleanup
  const phaseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel handler
  const handleCancel = useCallback(() => {
    hideRedirectOverlay();
  }, [hideRedirectOverlay]);

  // Setup phase progression and cancel timer when overlay opens
  useEffect(() => {
    if (!isOpen || !startTime) return;

    const cancelTimeout = config?.cancelTimeout ?? DEFAULT_CANCEL_TIMEOUT;
    const elapsed = Date.now() - startTime;

    // Clear any existing timers
    phaseTimersRef.current.forEach(clearTimeout);
    phaseTimersRef.current = [];
    if (cancelTimerRef.current) {
      clearTimeout(cancelTimerRef.current);
      cancelTimerRef.current = null;
    }

    // Schedule phase transitions
    const schedulePhase = (
      targetPhase: RedirectOverlayPhase,
      delay: number
    ) => {
      const adjustedDelay = Math.max(0, delay - elapsed);
      if (adjustedDelay > 0) {
        const timer = setTimeout(() => {
          setRedirectPhase(targetPhase);
        }, adjustedDelay);
        phaseTimersRef.current.push(timer);
      } else {
        // Already past this phase
        setRedirectPhase(targetPhase);
      }
    };

    schedulePhase('preparing', PHASE_TIMINGS.preparing);
    schedulePhase('redirecting', PHASE_TIMINGS.redirecting);

    // Schedule cancel button
    const cancelDelay = Math.max(0, cancelTimeout - elapsed);
    cancelTimerRef.current = setTimeout(() => {
      setShowCancelButton(true);
      setRedirectPhase('timeout');
    }, cancelDelay);

    // Cleanup
    return () => {
      phaseTimersRef.current.forEach(clearTimeout);
      phaseTimersRef.current = [];
      if (cancelTimerRef.current) {
        clearTimeout(cancelTimerRef.current);
        cancelTimerRef.current = null;
      }
    };
  }, [
    isOpen,
    startTime,
    config?.cancelTimeout,
    setRedirectPhase,
    setShowCancelButton,
  ]);

  // Handle browser back button (popstate)
  useEffect(() => {
    if (!isOpen) return;

    const handlePopState = () => {
      // User pressed back - hide overlay
      hideRedirectOverlay();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, hideRedirectOverlay]);

  // Handle tab visibility change
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      // If user switches away and comes back, the redirect probably failed
      // We could add logic here to show a "retry" state, but for now we keep overlay visible
      // This prevents the overlay from disappearing when user tabs away briefly
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOpen]);

  // Don't render if not open
  if (!isOpen) return null;

  // Get operation-specific translations
  const operationKey = getOperationKey(operation);

  // Try operation-specific translation, fallback to default
  const title =
    config?.title ??
    t(`redirectOverlay.${operationKey}.title`, {
      defaultValue: t('redirectOverlay.default.title'),
    });
  const message =
    config?.message ??
    t(`redirectOverlay.${operationKey}.message`, {
      defaultValue: t('redirectOverlay.default.message'),
    });
  const subtitle =
    config?.subtitle ??
    t(`redirectOverlay.${operationKey}.subtitle`, {
      defaultValue: t('redirectOverlay.default.subtitle'),
    });
  const ariaLabel = t(`redirectOverlay.${operationKey}.ariaLabel`, {
    defaultValue: t('redirectOverlay.default.ariaLabel'),
  });

  // Get phase message
  const phaseMessage = t(`redirectOverlay.phases.${phase}`);

  // Get icon
  const IconComponent = getOperationIcon(operation, config?.icon);

  return (
    <Portal>
      <div
        className="dndev-spinner-overlay"
        role="status"
        aria-busy="true"
        aria-label={ariaLabel}
        style={{
          // Ensure highest z-index for redirect overlay
          zIndex: 'var(--z-overlay, 9999)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--gap-md)',
            textAlign: 'center',
            maxWidth: '400px',
            padding: 'var(--gap-lg)',
          }}
        >
          {/* Icon + Spinner */}
          <Stack direction="row" align="center">
            {IconComponent && (
              <IconComponent
                style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  color: 'var(--primary)',
                }}
                aria-hidden="true"
              />
            )}
            <Spinner variant="primary" />
          </Stack>

          {/* Title */}
          <Text
            as="h3"
            style={{
              color: 'var(--foreground)',
              margin: 0,
            }}
          >
            {title}
          </Text>

          {/* Phase message (animated) */}
          <Text
            variant="muted"
            style={{
              color: 'var(--foreground)',
              minHeight: '1.5em',
            }}
          >
            {phaseMessage}
          </Text>

          {/* Operation-specific message */}
          <Text
            variant="muted"
            level="small"
            style={{
              opacity: 0.8,
            }}
          >
            {message}
          </Text>

          {/* Subtitle / hint */}
          <Text
            variant="muted"
            level="small"
            style={{
              opacity: 0.6,
            }}
          >
            {subtitle}
          </Text>

          {/* Do not refresh warning */}
          <Text
            variant="muted"
            level="small"
            style={{
              opacity: 0.5,
              marginTop: 'var(--gap-sm)',
            }}
          >
            {t('redirectOverlay.doNotRefresh')}
          </Text>

          {/* Cancel button (appears after timeout) */}
          {showCancelButton && (
            <Button
              variant="ghost"
              onClick={handleCancel}
              style={{
                marginTop: 'var(--gap-md)',
              }}
            >
              {t('redirectOverlay.cancel')}
            </Button>
          )}
        </div>
      </div>
    </Portal>
  );
}

export default RedirectOverlay;
