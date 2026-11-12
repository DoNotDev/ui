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

import { useRouter } from 'next/navigation';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
// No react-helmet-async on Next: React 19 hoists <title>/<meta>/<link> to <head>
// natively (see HeadTags). Rendering Helmet on the server throws (`document`),
// which is what blocked SSR. Vite keeps HelmetProvider in ViteAppProviders.

import type { ComponentType, ReactNode } from 'react';

import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental';

import {
  AppConfigProvider,
  AuthSessionProvider,
  getI18nInstance,
  getLanguageRouting,
  getProvider,
  getRequestLanguage,
  hasProvider,
  isMultilingual,
  LanguageNavigationProvider,
  QueryProviders,
  RequestLanguageProvider,
} from '@donotdev/core';
import { useConsent } from '@donotdev/core';
import type { AppProvidersProps, LanguageNavigate } from '@donotdev/core';
// Platform-specific hooks via conditional exports
import { useUrlLanguage } from '@donotdev/ui/routing/hooks';

import { NextJsStoresInitializer } from '../internal/initializers/NextJsStoresInitializer';
import { AutoMetaTags } from '../internal/layout/components/AutoMetaTags';
import FaviconHead from '../internal/layout/components/FaviconHead';
import PerformanceHints from '../internal/layout/components/PerformanceHints';
import { DnDevLayout } from '../internal/layout/DnDevLayout';
import { SentryInitializer } from '../internal/providers/SentryInitializer';
import { UIProviders } from '../internal/providers/UIProviders';
import { AuthReturnTo } from '../routing/AuthReturnTo';
import { PasswordResetCallback } from '../utils/useAuthSafe';

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
 * Language of the render. 2+ languages: the URL's (`/en/…`, the default language at
 * the root; the generated proxy already moved a first visit to the visitor's
 * language). One language: from the request headers (language cookie >
 * Accept-Language > fallback). Same inputs on the server and in the hydration pass.
 */
function useRenderLanguage(
  serverCookies: string | undefined,
  acceptLanguage: string | null | undefined
): string {
  const urlLanguage = useUrlLanguage();
  const multilingual = isMultilingual(getLanguageRouting().languages);
  const requestLanguage = useMemo(
    () => getRequestLanguage(serverCookies, acceptLanguage),
    [serverCookies, acceptLanguage]
  );
  return multilingual ? urlLanguage : requestLanguage;
}

/**
 * The live i18n instance follows the render language: a language switch navigates
 * client-side to the other language's URL, and the page re-renders in it.
 */
function useFollowLanguage(language: string): void {
  useEffect(() => {
    const instance = getI18nInstance();
    if (instance.language !== language) void instance.changeLanguage(language);
  }, [language]);
}

/**
 * NextJsAppProviders - Next.js platform-specific app providers
 *
 * Clean provider hierarchy with configuration via context (no prop drilling).
 *
 * Language: the URL's with 2+ languages (one URL per language), else the request's
 * (`serverCookies` / `acceptLanguage`). Language switchers navigate client-side to the
 * other language's URL (LanguageNavigationProvider, Next router).
 *
 * Provider hierarchy:
 * 1. AppConfigProvider (configuration context)
 * 2. AutoMetaTags (SEO head, server-rendered; no Helmet on Next)
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
  /**
   * The request's `Cookie` header, passed by the app's root layout. The server render
   * and the client's hydration pass read the language cookie and the auth session
   * from it, so both render the visitor's language and signed-in state.
   */
  serverCookies?: string;
  /** The request's `Accept-Language` header, passed by the app's root layout. */
  acceptLanguage?: string | null;
}

/** Auth session snapshot of the request, `null` when the auth provider cannot tell. */
function readAuthSnapshot(cookieHeader: string | undefined) {
  if (cookieHeader === undefined || !hasProvider('auth')) return null;
  return getProvider('auth').readSessionSnapshot?.(cookieHeader) ?? null;
}

export function NextJsAppProviders(props: NextJsAppProvidersProps) {
  const {
    config = {},
    layout,
    children,
    serverCookies,
    acceptLanguage,
    customStores,
  } = props;
  // Same URL and header values on the server and in the hydration pass → same language
  // and signed-in state on both, so the first paint is final (no keys, no auth swap).
  const language = useRenderLanguage(serverCookies, acceptLanguage);
  useFollowLanguage(language);
  // Language switchers (core) open the other language's URL through the Next router
  const router = useRouter();
  const navigateToLanguage: LanguageNavigate = (url) =>
    router.push(url, { scroll: false });
  const authSnapshot = useMemo(
    () => readAuthSnapshot(serverCookies),
    [serverCookies]
  );
  // SSR is the default for Next apps: render the provider tree on the server so
  // page content is present in the initial HTML (crawlable, real SSR). An app
  // opts OUT with appConfig.ssr === false, restoring the legacy client-only
  // render (the tree mounts after hydration). Hooks are still called
  // unconditionally to keep render order stable.
  const ssr = config.ssr !== false;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!ssr && !isMounted) {
    return <>{children}</>;
  }

  return (
    <RequestLanguageProvider language={language}>
      <LanguageNavigationProvider navigate={navigateToLanguage}>
        <AuthSessionProvider snapshot={authSnapshot}>
          <AppConfigProvider config={config} platform="nextjs">
            <SentryInitializer />
            <NextJsStoresInitializer
              serverCookies={serverCookies}
              customStores={customStores}
            >
              {/* Favicon - uses useFaviconConfig() internally */}
              <FaviconHead />

              {/* Performance hints - preconnects for faster third-party loads */}
              <PerformanceHints />

              <QueryProviders>
                {/* Queries read during the server render (CRUD lists) stream to the
                  browser cache with the HTML, so the hydration pass reads the same data
                  as the server: no loading state, no layout swap on first paint. */}
                <ReactQueryStreamedHydration>
                  <UIProviders>
                    {/* SEO: same head as Vite (title, description, canonical, og, JSON-LD), in the
                      server HTML. On dynamic routes the page's <Seo> owns the page identity. */}
                    <AutoMetaTags />

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
                </ReactQueryStreamedHydration>
              </QueryProviders>
            </NextJsStoresInitializer>
          </AppConfigProvider>
        </AuthSessionProvider>
      </LanguageNavigationProvider>
    </RequestLanguageProvider>
  );
}
