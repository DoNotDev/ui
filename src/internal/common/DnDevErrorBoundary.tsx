'use client';
// packages/ui/src/internal/common/DnDevErrorBoundary.tsx

/**
 * @fileoverview DnDevErrorBoundary component
 * @description React error boundary for catching and handling component errors
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import {
  Component,
  type ErrorInfo,
  type ReactElement,
  type ReactNode,
} from 'react';

import { handleError } from '@donotdev/core';

interface DnDevErrorBoundaryProps {
  children: ReactNode;
  fallback: (props: {
    error: unknown;
    resetError: () => void;
    componentStack?: string | null;
    eventId?: string | null;
  }) => ReactElement;
  level?: 'app' | 'route' | 'component';
}

interface DnDevErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

/**
 * Next.js router control flow (`notFound()`, `forbidden()`, `unauthorized()`, `redirect()`,
 * `permanentRedirect()`): an error whose `digest` is `NEXT_HTTP_ERROR_FALLBACK;<status>`
 * or `NEXT_REDIRECT;...`. It is not a failure: Next's own boundaries (not-found page,
 * redirect) handle it, the same check as Next's `isNextRouterError`. Never true on Vite.
 */
function isNextRouterError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('digest' in error)) {
    return false;
  }
  const { digest } = error as { digest: unknown };
  if (typeof digest !== 'string') return false;
  const code = digest.split(';')[0];
  return code === 'NEXT_HTTP_ERROR_FALLBACK' || code === 'NEXT_REDIRECT';
}

/**
 * React error boundary for catching and handling component errors.
 * Next router control flow ({@link isNextRouterError}) passes through to Next's
 * boundaries, so a page's `notFound()` shows the app's 404 page, not the error fallback.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export class DnDevErrorBoundary extends Component<
  DnDevErrorBoundaryProps,
  DnDevErrorBoundaryState
> {
  constructor(props: DnDevErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): DnDevErrorBoundaryState {
    // Re-thrown: the nearest Next boundary above (not-found, redirect) handles it
    if (isNextRouterError(error)) throw error;
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    // Use your existing error handling system
    handleError(error, {
      userMessage: `A ${this.props.level || 'component'} error occurred`,
      context: {
        errorInfo,
        component: 'DnDevErrorBoundary',
        level: this.props.level || 'component',
      },
      showNotification: false, // Don't show notification since we're showing the fallback UI
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback({
        error: this.state.error,
        resetError: this.resetError,
        componentStack: null, // We don't have component stack info in our custom boundary
        eventId: null, // We don't have event ID in our custom boundary
      });
    }

    return this.props.children;
  }
}

export default DnDevErrorBoundary;
