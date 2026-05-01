'use client';
// packages/ui/src/internal/common/ErrorFallback.tsx

/**
 * @fileoverview Shared Error Fallback Component
 * @description A single error UI that takes full viewport and adapts recovery actions based on the context (global vs route errors). Uses only native HTML elements and emojis to avoid component dependencies.
 * it's not using anything to make sure it doesnt crash.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useState } from 'react';

import type { ComponentType } from 'react';
interface ErrorFallbackProps {
  error: unknown;
  resetError: () => void;
  componentStack?: string | null;
  eventId?: string | null;
  onGoBack?: () => void;
  onGoHome?: () => void;
  onRetry?: () => void;
  onReportIssue?: () => void;
}

/**
 * Shared Error Fallback Component
 *
 * Single error UI that takes full viewport and adapts recovery actions
 * based on the context (global vs route errors).
 * Uses only native HTML elements and emojis to avoid component dependencies.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const ErrorFallback: ComponentType<ErrorFallbackProps> = ({
  error,
  resetError,
  componentStack,
  eventId,
  onGoBack,
  onGoHome,
  onRetry,
  onReportIssue,
}) => {
  const [copiedStack, setCopiedStack] = useState(false);

  // Extract error details once
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;
  const isDevelopment = process.env.NODE_ENV === 'development';

  const handleCopyStackTrace = async () => {
    if (!errorStack) return;

    const fullErrorInfo = [
      `Error: ${errorMessage}`,
      `Timestamp: ${new Date().toISOString()}`,
      `User Agent: ${navigator.userAgent}`,
      eventId ? `Event ID: ${eventId}` : null,
      '',
      'Stack Trace:',
      errorStack,
      componentStack ? '\nComponent Stack:' : null,
      componentStack || null,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(fullErrorInfo);
      setCopiedStack(true);

      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedStack(false), 2000);
    } catch (err) {
      console.error('Failed to copy stack trace:', err);
    }
  };

  const handleRetry = () => {
    onRetry?.() || resetError();
  };

  const handleGoBack = () => {
    onGoBack?.();
  };

  const handleGoHome = () => {
    onGoHome?.();
  };

  const handleReportIssue = () => {
    onReportIssue?.();
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '100%',
          textAlign: 'center',
          maxWidth: '65ch',
          padding: '2rem',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Error Icon */}
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2rem',
              width: '5rem',
              height: '5rem',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              borderRadius: '50%',
              border: '1px solid #dc2626',
            }}
          >
            <span
              style={{
                fontSize: '2rem',
                lineHeight: 1,
                fontWeight: 600,
                color: '#dc2626',
              }}
            >
              !
            </span>
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: '#000000',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: '1.25rem',
              marginBottom: '0.5rem',
              color: '#555555',
            }}
          >
            We encountered an error while loading this page.
          </p>
          <p
            style={{
              color: '#10b981',
              fontWeight: 500,
            }}
          >
            Don't worry, your data is safe.
          </p>
        </div>

        {/* Error ID */}
        {eventId && (
          <div
            style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              marginBottom: '2rem',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              color: '#dc2626',
              borderRadius: '9999px',
              fontFamily: 'monospace',
            }}
          >
            Error ID: {eventId}
          </div>
        )}

        {/* Error Message (Development Only) */}
        {isDevelopment && errorMessage && (
          <div
            style={{
              backgroundColor: '#ffffff',
              marginBottom: '2rem',
              padding: '1rem',
              textAlign: 'start',
              border: '1px solid #fecaca',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#dc2626',
                }}
              >
                Error Message:
              </span>
              <button
                onClick={handleCopyStackTrace}
                disabled={copiedStack}
                style={{
                  height: '1.75rem',
                  cursor: copiedStack ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  border: copiedStack
                    ? '1px solid #10b981'
                    : '1px solid #e5e7eb',
                  borderRadius: '4px',
                  backgroundColor: copiedStack
                    ? 'rgba(16, 185, 129, 0.1)'
                    : '#ffffff',
                  color: copiedStack ? '#10b981' : '#000000',
                  fontSize: '0.875rem',
                }}
              >
                {copiedStack ? '✅' : '📋'}
                {copiedStack ? 'Copied' : 'Copy Details'}
              </button>
            </div>
            <p
              style={{
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                color: '#000000',
              }}
            >
              {errorMessage}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginTop: '2rem',
          }}
        >
          <button
            onClick={handleRetry}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              fontSize: '1.125rem',
              fontWeight: 500,
              padding: '0.75rem 1.5rem',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            🔄 Try Again
          </button>

          {onGoBack && (
            <button
              onClick={handleGoBack}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                fontSize: '1.125rem',
                fontWeight: 500,
                padding: '0.75rem 1.5rem',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              ← Go Back
            </button>
          )}

          <button
            onClick={handleGoHome}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              fontSize: '1.125rem',
              fontWeight: 500,
              padding: '0.75rem 1.5rem',
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            🏠 Go to Homepage
          </button>
        </div>

        <p
          style={{
            fontSize: '0.875rem',
            marginTop: '2rem',
            color: '#555555',
          }}
        >
          If the problem persists, please contact support.
        </p>
      </div>
    </div>
  );
};

export default ErrorFallback;
