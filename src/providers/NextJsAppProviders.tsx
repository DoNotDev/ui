'use client';
// packages/ui/src/providers/NextJsAppProviders.tsx

/**
 * @fileoverview NextJsAppProviders component
 * @description Next.js-specific app providers with SSR support
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { HelmetProvider } from 'react-helmet-async';

import { QueryProviders, AppConfigProvider } from '@donotdev/core';
import { useConsent } from '@donotdev/core';
import type { AppProvidersProps } from '@donotdev/core';

import { NextJsStoresInitializer } from '../internal/initializers/NextJsStoresInitializer';
import FaviconHead from '../internal/layout/components/FaviconHead';
import PerformanceHints from '../internal/layout/components/PerformanceHints';
// import NextJsAutoMetaTags from '../internal/layout/components/NextJsAutoMetaTags'; // Deprecated - metadata now server-side
import { DnDevLayout } from '../internal/layout/DnDevLayout';
import { SentryInitializer } from '../internal/providers/SentryInitializer';
import { UIProviders } from '../internal/providers/UIProviders';
import { PasswordResetCallback } from '../utils/useAuthSafe';
import { AuthReturnTo } from '../routing/AuthReturnTo';

import type { ComponentType, ReactNode } from 'react';

// Null fallback for lazy components that fail to load (e.g., optional auth dependency absent)
const NullFallback = () => null;

// Lazy load client-only components — each wrapped with catch to prevent hanging
// if an optional dependency (e.g., @donotdev/auth) is not installed.
const CookieConsent = lazy(() =>
  import('../components/cookie-consent/CookieConsent').catch(
    (): { default: typeof NullFallback } => ({ default: NullFallback })
  )
);
const PWAUpdateNotification = lazy(() =>
  import('../internal/layout/components/PWAUpdateNotification')
    .then((m) => ({ default: m.default }))
    .catch((): { default: typeof NullFallback } => ({ default: NullFallback }))
);
const RedirectOverlay = lazy(() =>
  import('../components/common/RedirectOverlay')
    .then((m) => ({ default: m.RedirectOverlay }))
    .catch((): { default: typeof NullFallback } => ({ default: NullFallback }))
);

/**
 * ConsentBanner - Lazy loaded consent component
 * Only shows if user hasn't consented yet
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
function ConsentBanner() {
  const hasConsented = useConsent('hasConsented');
  const showBanner = useConsent('showBanner');

  if (hasConsented && !showBanner) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <CookieConsent />
    </Suspense>
  );
}

/**
 * NextJsAppProviders - Next.js platform-specific app providers
 *
 * Clean provider hierarchy with configuration via context (no prop drilling).
 *
 * Provider hierarchy:
 * 1. AppConfigProvider (configuration context)
 * 2. HelmetProvider (head management)
 * 3. NextJsStoresInitializer (store setup, SSR-safe)
 * 4. QueryProviders (React Query)
 * 5. UIProviders (design system)
 * 6. Layout + Content
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 *
 * @example
 * ```tsx
 * <NextJsAppProviders
 * config={{ app: { name: 'My App' } }}
 * >
 * {children}
 * </NextJsAppProviders>
 * ```
 */
export interface NextJsAppProvidersProps extends AppProvidersProps {
  serverCookies?: string;
}

export function NextJsAppProviders(props: NextJsAppProvidersProps) {
  const { config = {}, layout, children, serverCookies, customStores } = props;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <AppConfigProvider config={config} platform="nextjs">
      <SentryInitializer />
      <HelmetProvider>
        <NextJsStoresInitializer
          serverCookies={serverCookies}
          customStores={customStores}
        >
          {/* Favicon - uses useFaviconConfig() internally */}
          <FaviconHead />

          {/* Performance hints - preconnects for faster third-party loads */}
          <PerformanceHints />

          <QueryProviders>
            <UIProviders>
              {/* SEO - Metadata is now generated server-side via generateMetadata() in page files */}
              {/* NextJsAutoMetaTags is deprecated - metadata comes from Next.js Metadata API */}
              {/* <NextJsAutoMetaTags /> */}

              {/* Layout - uses config hooks internally */}
              <DnDevLayout layout={layout}>{children}</DnDevLayout>

              {/* Cookie consent */}
              <ConsentBanner />

              {/* Auth return-to after OAuth redirect */}
              <AuthReturnTo />

              {/* Password reset overlay - auto-detects from URL hash / store */}
              <PasswordResetCallback />

              {/* PWA update notification - auto-injected when PWA enabled */}
              <Suspense fallback={null}>
                <PWAUpdateNotification />
              </Suspense>

              {/* Redirect overlay - auto-shown by billing/auth hooks */}
              <Suspense fallback={null}>
                <RedirectOverlay />
              </Suspense>
            </UIProviders>
          </QueryProviders>
        </NextJsStoresInitializer>
      </HelmetProvider>
    </AppConfigProvider>
  );
}
