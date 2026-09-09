'use client';
// packages/ui/src/internal/common/GlobalErrorFallback.tsx

/**
 * @fileoverview GlobalErrorFallback component
 * @description Global error boundary fallback for application-level errors
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useEffect } from 'react';
import type { ComponentType } from 'react';

import { handleError } from '@donotdev/core';

import ErrorFallback from './ErrorFallback';

// Update the interface to match both Sentry's types and our custom boundary
interface SentryFallbackProps {
  error: unknown;
  resetError: () => void;
  componentStack?: string | null;
  eventId?: string | null;
}

/**
 * Global error boundary fallback component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const GlobalErrorFallback: ComponentType<SentryFallbackProps> = ({
  error,
  resetError,
  componentStack,
  eventId,
}) => {
  useEffect(() => {
    // Use your existing error handling system
    handleError(error, {
      userMessage: 'A global error occurred',
      context: { component: 'GlobalErrorFallback', componentStack, eventId },
      showNotification: false, // Don't show notification since we're already showing the fallback UI
    });
  }, [error, componentStack, eventId]);

  const handleReloadPage = () => {
    resetError();
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    resetError();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <ErrorFallback
      error={error}
      resetError={resetError}
      componentStack={componentStack}
      eventId={eventId}
      onRetry={handleReloadPage}
      onGoHome={handleGoHome}
    />
  );
};

export default GlobalErrorFallback;
