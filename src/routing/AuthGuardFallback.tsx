// packages/ui/src/routing/AuthGuardFallback.tsx

/**
 * @fileoverview AuthGuardFallback component
 * @description Shows login options when users hit protected routes
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Shield, ArrowLeft, User, Lock, AlertTriangle } from 'lucide-react';
import { Suspense, lazy } from 'react';

import { Card, Button, Separator, Stack, cn } from '@donotdev/components';
import { useTranslation } from '@donotdev/core';
import { useBreakpoint } from '@donotdev/core';
// Platform-specific hooks via conditional exports
import { useLocation, useBack } from '@donotdev/ui/routing/hooks';

import { PageContainer } from '../components/layout/PageContainer';

// Lazy load MultipleAuthProviders to enable code splitting
const MultipleAuthProviders = lazy(() =>
  import('@donotdev/auth').then((module) => ({
    default: module.MultipleAuthProviders,
  }))
);

interface AuthGuardFallbackProps {
  /** Custom title for the fallback */
  title?: string;
  /** Custom description for the fallback */
  description?: string;
  /** Whether to show a back button */
  showBackButton?: boolean;
  /** Custom back button action */
  onBack?: () => void;
  /** Custom CSS class */
  className?: string;
}

/**
 * AuthGuardFallback - Shows login options when users hit protected routes
 *
 * Instead of redirecting to a separate login page, this component shows
 * the authentication options directly on the protected route, providing
 * better UX and keeping users in context.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function AuthGuardFallback({
  title,
  description,
  showBackButton = true,
  onBack,
  className = '',
}: AuthGuardFallbackProps) {
  const { t } = useTranslation(['auth', 'common']);
  const location = useLocation();
  const back = useBack();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      back();
    }
  };

  return (
    <PageContainer variant="docs">
      <Stack
        align="center"
        justify="center"
        className={cn('dndev-min-h-60', className)}
        style={{
          paddingTop: 'var(--gap-lg)',
          paddingBottom: 'var(--gap-lg)',
        }}
      >
        <Card
          className="dndev-w-full"
          style={{
            maxWidth: '28rem',
            border: 'none',
            boxShadow: 'var(--shadow-xl)',
          }}
          title={
            <Stack>
              <Stack justify="center">
                <div
                  style={{
                    borderRadius: '9999px',
                    backgroundColor:
                      'color-mix(in oklab, var(--primary) 10%, transparent)',
                    padding: 'var(--gap-md)',
                  }}
                >
                  <Lock
                    className="dndev-size-touch"
                    style={{ color: 'var(--primary)' }}
                  />
                </div>
              </Stack>
              <div
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 700,
                }}
              >
                {t('auth.fallback.title', 'Authentication Required')}
              </div>
              <p style={{ color: 'var(--muted-foreground)' }}>
                {t(
                  'auth.fallback.description',
                  'Please sign in to access this page'
                )}
              </p>
            </Stack>
          }
        >
          <Stack>
            <Stack gap="large">
              <div>
                <p
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  {t('auth.fallback.chooseProvider')}
                </p>
              </div>

              <Suspense fallback={<div>Loading providers...</div>}>
                <MultipleAuthProviders
                  layout="vertical"
                  spacing="tight"
                  fullWidth={true}
                  ariaLabel={t('auth.fallback.authOptions')}
                />
              </Suspense>
            </Stack>

            {showBackButton && (
              <>
                <Separator />
                <div>
                  <Button
                    onClick={handleBack}
                    className="dndev-gap-sm"
                    icon={ArrowLeft}
                  >
                    {t('common.back')}
                  </Button>
                </div>
              </>
            )}

            <Stack
              gap="tight"
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--muted-foreground)',
              }}
            >
              <p>{t('auth.fallback.secure')}</p>
              <p>{t('auth.fallback.terms')}</p>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </PageContainer>
  );
}

export default AuthGuardFallback;
