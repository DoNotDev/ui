'use client';
// packages/ui/src/routing/404.tsx

/**
 * @fileoverview 404 Not Found page component
 * @description Professional 404 page with full-viewport centered layout, i18n, and dynamic route suggestions
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Home, ArrowLeft, Link as LinkIcon } from 'lucide-react';
import { useMemo } from 'react';

import { Button, BUTTON_VARIANT, Stack, Text } from '@donotdev/components';
import { useTranslation } from '@donotdev/core';
import type { PageMeta } from '@donotdev/core';
// Platform-specific hooks via conditional exports
import { useLocation, useNavigate } from '@donotdev/ui/routing/hooks';

import { Link } from './Link';
import { useNavigationItems } from './useNavigation';
import { Icon } from '../components/common/icon';
import { PageContainer } from '../components/layout/PageContainer';

/**
 * 404 Not Found page metadata configuration
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const meta: PageMeta = {
  hideFromMenu: true,
};

/**
 * Professional 404 Not Found page component
 *
 * Features:
 * - Full-viewport centered design for professional appearance
 * - Translation system integration (i18n)
 * - Dynamic route suggestions from discovered routes
 * - Accessible design with proper semantic HTML
 * - Responsive across all viewports
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export default function NotFoundPage() {
  const { t } = useTranslation('dndev');
  const location = useLocation();
  const navigate = useNavigate();
  const navigationItems = useNavigationItems();

  /**
   * Get suggested routes for navigation
   * Filters out dynamic routes, home, and limits to 4 suggestions
   */
  const suggestedRoutes = useMemo(() => {
    return navigationItems
      .filter((route) => !route.path.includes(':') && route.path !== '/')
      .slice(0, 4);
  }, [navigationItems]);

  /**
   * Handle back button click
   * Uses navigate('back') for platform-agnostic back navigation
   */
  const handleBack = () => {
    navigate('back');
  };

  return (
    <PageContainer variant="docs" centered>
      <Stack gap="large" align="center" justify="center">
        {/* Error Code - Large, friendly typography */}
        <Stack align="center">
          <Text
            level="h1"
            style={{
              fontSize: 'clamp(4rem, 12vw, 8rem)',
              fontWeight: 'var(--font-weight-bold)',
              lineHeight: 1,
              letterSpacing: '-0.02em',
              background:
                'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
            }}
          >
            404
          </Text>

          <Text
            level="h2"
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-semibold)',
              margin: 0,
            }}
          >
            {t('errors.notFound.title', 'Page Not Found')}
          </Text>

          <Text
            style={{
              fontSize: 'var(--font-size-lg)',
              color: 'var(--muted-foreground)',
              textAlign: 'center',
              margin: 0,
            }}
          >
            {t(
              'errors.notFound.description',
              "The page you're looking for doesn't exist or has been moved."
            )}
          </Text>

          {/* Show requested URL if available */}
          {location.pathname && (
            <code
              style={{
                padding: 'var(--gap-sm) var(--gap-md)',
                background: 'var(--muted)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-mono)',
                color: 'var(--foreground)',
                wordBreak: 'break-all',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                border: '1px solid var(--border-hairline)',
              }}
            >
              {location.pathname}
            </code>
          )}
        </Stack>

        {/* Navigation Suggestions - Dynamic from routes */}
        {suggestedRoutes.length > 0 && (
          <Stack align="center">
            <p
              className="dndev-text-base"
              style={{
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-semibold)',
                margin: 0,
                color: 'var(--muted-foreground)',
              }}
            >
              {t('errors.notFound.suggestions', 'You might be looking for:')}
            </p>

            <Stack direction="row" wrap="wrap" justify="center" gap="tight">
              {suggestedRoutes.map((route) => (
                <Link key={route.path} path={route.path} replace={true}>
                  <Button
                    variant={BUTTON_VARIANT.OUTLINE}
                    icon={<Icon icon={route.icon} fallback={LinkIcon} />}
                    aria-label={t(
                      'errors.notFound.navigateTo',
                      `Navigate to ${route.label}`,
                      { label: route.label }
                    )}
                  >
                    {route.label}
                  </Button>
                </Link>
              ))}
            </Stack>
          </Stack>
        )}

        {/* Primary Actions */}
        <Stack direction="row" wrap="wrap" justify="center">
          <Link path="/" replace={true}>
            <Button
              variant={BUTTON_VARIANT.DEFAULT}
              icon={Home}
              aria-label={t('errors.notFound.goHome', 'Go to home page')}
            >
              {t('errors.notFound.goHome', 'Go Home')}
            </Button>
          </Link>

          <Button
            variant={BUTTON_VARIANT.OUTLINE}
            icon={ArrowLeft}
            onClick={handleBack}
            aria-label={t('errors.notFound.goBack', 'Go back to previous page')}
          >
            {t('errors.notFound.goBack', 'Go Back')}
          </Button>
        </Stack>
      </Stack>
    </PageContainer>
  );
}
