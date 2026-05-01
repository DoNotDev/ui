// packages/ui/src/internal/providers/SentryInitializer.tsx

/**
 * @fileoverview Sentry Initializer Component
 * @description Initializes Sentry error tracking if configured
 *
 * Uses useLayoutEffect to initialize Sentry once on mount.
 * Gracefully degrades if VITE_SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN is not set.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useLayoutEffect, useRef } from 'react';

import { initSentry } from '@donotdev/core';

/**
 * SentryInitializer - Initializes Sentry error tracking
 *
 * Runs once on mount using useLayoutEffect (synchronous, before paint).
 * Gracefully degrades if Sentry DSN is not configured.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function SentryInitializer(): null {
  const hasInitialized = useRef(false);

  useLayoutEffect(() => {
    if (hasInitialized.current) return;

    hasInitialized.current = true;
    initSentry().catch(() => {
      // Silently handle initialization errors - Sentry is optional
    });
  }, []);

  return null;
}
