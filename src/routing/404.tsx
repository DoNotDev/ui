'use client';
// packages/ui/src/routing/404.tsx

/**
 * @fileoverview 404 Not Found page component
 * @description Professional 404 page: one page Section, i18n, and dynamic route suggestions
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Home, ArrowLeft, Link as LinkIcon } from 'lucide-react';
import { useMemo } from 'react';

import { Button, BUTTON_VARIANT, Section, Stack, Text } from '@donotdev/components';
import { useTranslation } from '@donotdev/core';
import type { PageMeta } from '@donotdev/core';
// Platform-specific hooks via conditional exports
import { useNavigate, useRoutePath } from '@donotdev/ui/routing/hooks';

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
 * - One page Section (the block padding every page has), content centred horizontally
 * - The page's `<h1>` is the title (`errors.notFound.title`); "404" is visual only.
 *   The document `<title>` of the 404 document is that same title (AutoMetaTags)
 * - Translation system integration (i18n)
 * - Dynamic route suggestions from discovered routes (in the server HTML), last: the 404
 *   document renders signed out (no request data), so a signed-in visitor's list grows
 *   once the session is known; below the Home / Back actions, that never moves them
 * - Optional requested-path badge (shown by default for existing consumers)
 * - Responsive across all viewports
 *
 * Legacy errors.notFound keys are compatibility references to the canonical
 * messages.notFound resources. Keep lookups here so legacy app overrides win.
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export default function NotFoundPage({
  showRequestedPath = true,
}: {
  /** Display the current route path. Disable for shared, statically generated fallbacks. */
  showRequestedPath?: boolean;
} = {}) {
  const { t } = useTranslation('dndev');
  const pathname = useRoutePath();
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
      <Section tone="ghost" align="center">
        <Stack gap="large" align="center">
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
              as="h1"
              level="h2"
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-semibold)',
                margin: 0,
              }}
            >
              {t('errors.notFound.title')}
            </Text>

            <Text
              style={{
                fontSize: 'var(--font-size-lg)',
                color: 'var(--muted-foreground)',
                textAlign: 'center',
                margin: 0,
              }}
            >
              {t('errors.notFound.description')}
            </Text>

            {/* Static fallbacks cannot know the eventual requested URL. */}
            {showRequestedPath && pathname && (
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
                {pathname}
              </code>
            )}
          </Stack>

          {/* Primary Actions */}
          <Stack direction="row" wrap="wrap" justify="center">
            <Link path="/" replace={true}>
              <Button
                variant={BUTTON_VARIANT.DEFAULT}
                icon={Home}
                aria-label={t('errors.notFound.goHome')}
              >
                {t('errors.notFound.goHome')}
              </Button>
            </Link>

            <Button
              variant={BUTTON_VARIANT.OUTLINE}
              icon={ArrowLeft}
              onClick={handleBack}
              aria-label={t('errors.notFound.goBack')}
            >
              {t('errors.notFound.goBack')}
            </Button>
          </Stack>

          {/* Navigation Suggestions - Dynamic from routes. Last: the list can grow once
              a signed-in visitor's session is known, never moving the content above */}
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
                {t('errors.notFound.suggestions')}
              </p>

              <Stack direction="row" wrap="wrap" justify="center" gap="tight">
                {suggestedRoutes.map((route) => (
                  <Link key={route.path} path={route.path} replace={true}>
                    <Button
                      variant={BUTTON_VARIANT.OUTLINE}
                      icon={<Icon icon={route.icon} fallback={LinkIcon} />}
                      aria-label={t('errors.notFound.navigateTo', {
                        label: route.label,
                      })}
                    >
                      {route.label}
                    </Button>
                  </Link>
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Section>
    </PageContainer>
  );
}
