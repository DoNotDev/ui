'use client';
// packages/ui/src/internal/common/RouteErrorFallback.tsx

/**
 * @fileoverview Route error fallback component
 * @description Professional route error fallback using framework components. Only for route-level errors (framework is stable).
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import {
  AlertTriangle,
  Home,
  ArrowLeft,
  RotateCw,
  Copy,
  Check,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Button,
  BUTTON_VARIANT,
  Card,
  CARD_VARIANT,
  Alert,
  ALERT_VARIANT,
  Stack,
} from '@donotdev/components';
import { handleError, useTranslation } from '@donotdev/core';
import { useLocation, useBack } from '@donotdev/ui/routing/hooks';

// Platform-specific hooks via conditional exports
import { Link } from '../../routing/Link';

import type { ComponentType } from 'react';

interface RouteErrorFallbackProps {
  error: unknown;
  resetError: () => void;
  componentStack?: string | null;
  eventId?: string | null;
}

/**
 * Professional Route Error Fallback Component
 *
 * Uses framework components (Card, Button, Alert, PageContainer) for consistent design.
 * Only used for route-level errors where framework is stable.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const RouteErrorFallback: ComponentType<RouteErrorFallbackProps> = ({
  error,
  resetError,
  componentStack,
  eventId,
}) => {
  const { t } = useTranslation('dndev');
  const [copiedStack, setCopiedStack] = useState(false);
  const back = useBack();
  const location = useLocation();
  const pathname =
    location?.pathname ||
    (typeof window !== 'undefined' ? window.location.pathname : '/');

  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    try {
      handleError(error, {
        userMessage: 'Page encountered an error',
        context: { component: 'RouteErrorFallback', location: pathname },
      });
    } catch (err) {
      console.error('Error in RouteErrorFallback:', error);
      console.error('handleError also failed:', err);
    }
  }, [error, pathname]);

  const handleCopyStackTrace = async () => {
    if (!errorStack) return;

    const fullErrorInfo = [
      `Error: ${errorMessage}`,
      `Timestamp: ${new Date().toISOString()}`,
      `User Agent: ${navigator.userAgent}`,
      eventId ? `Event ID: ${eventId}` : null,
      `Path: ${pathname}`,
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
      setTimeout(() => setCopiedStack(false), 2000);
    } catch (err) {
      console.error('Failed to copy stack trace:', err);
    }
  };

  const handleRetry = () => {
    try {
      resetError();
    } catch (err) {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  const handleGoBack = () => {
    try {
      back();
    } catch {
      if (typeof window !== 'undefined') {
        window.history.back();
      }
    }
  };

  return (
    <div
      className="dndev-container"
      data-variant="standard"
      data-centered="true"
    >
      <Card
        variant={CARD_VARIANT.DEFAULT}
        elevated
        className="dndev-w-full"
        style={{ maxWidth: '65ch', margin: '0 auto' }}
      >
        <Stack gap="large" align="center" className="dndev-text-center">
          <Stack
            align="center"
            justify="center"
            style={{
              width: '5rem',
              height: '5rem',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              borderRadius: '50%',
              border: '1px solid var(--destructive)',
            }}
          >
            <AlertTriangle
              style={{
                width: '2.5rem',
                height: '2.5rem',
                color: 'var(--destructive)',
              }}
              aria-hidden="true"
            />
          </Stack>

          <Stack>
            <h1
              className="dndev-text-base"
              data-level="h1"
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                margin: 0,
              }}
            >
              {t('routeError.title', 'Something went wrong')}
            </h1>
            <p
              className="dndev-text-base"
              style={{
                fontSize: 'var(--font-size-lg)',
                color: 'var(--muted-foreground)',
                margin: 0,
              }}
            >
              {t(
                'routeError.description',
                'We encountered an error while loading this page.'
              )}
            </p>
            <Alert variant={ALERT_VARIANT.INFO} hideIcon>
              <div
                style={{ fontSize: 'var(--font-size-sm)', textAlign: 'center' }}
              >
                {t('routeError.dataSafe', "Don't worry, your data is safe.")}
              </div>
            </Alert>
          </Stack>

          {eventId && (
            <code
              style={{
                padding: 'var(--gap-sm) var(--gap-md)',
                background: 'var(--muted)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-size-xs)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--foreground)',
              }}
            >
              {t('routeError.errorId', 'Error ID')}: {eventId}
            </code>
          )}

          {isDevelopment && errorMessage && (
            <Card variant={CARD_VARIANT.MUTED} className="dndev-w-full">
              <Stack direction="row" align="center" justify="between">
                <span
                  className="dndev-text-base"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--destructive)',
                  }}
                >
                  Error Message:
                </span>
                <Button
                  variant={BUTTON_VARIANT.GHOST}
                  icon={copiedStack ? Check : Copy}
                  onClick={handleCopyStackTrace}
                  disabled={copiedStack}
                >
                  {copiedStack
                    ? t('routeError.copied', 'Copied')
                    : t('routeError.copyDetails', 'Copy Details')}
                </Button>
              </Stack>
              <pre
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-mono)',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  color: 'var(--foreground)',
                  margin: 0,
                  marginTop: 'var(--gap-sm)',
                }}
              >
                {errorMessage}
              </pre>
            </Card>
          )}

          <Stack className="dndev-w-full">
            <Button
              variant={BUTTON_VARIANT.DESTRUCTIVE}
              icon={RotateCw}
              onClick={handleRetry}
              fullWidth
            >
              {t('routeError.tryAgain', 'Try Again')}
            </Button>

            <Stack direction="row" justify="center">
              <Link path="/">
                <Button variant={BUTTON_VARIANT.DEFAULT} icon={Home} fullWidth>
                  {t('routeError.goHome', 'Go Home')}
                </Button>
              </Link>
              <Button
                variant={BUTTON_VARIANT.OUTLINE}
                icon={ArrowLeft}
                onClick={handleGoBack}
                fullWidth
              >
                {t('routeError.goBack', 'Go Back')}
              </Button>
            </Stack>
          </Stack>

          <p
            className="dndev-text-base"
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--muted-foreground)',
              margin: 0,
            }}
          >
            {t(
              'routeError.contactSupport',
              'If the problem persists, please contact support.'
            )}
          </p>
        </Stack>
      </Card>
    </div>
  );
};

export default RouteErrorFallback;
