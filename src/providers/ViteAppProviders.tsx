// packages/ui/src/providers/ViteAppProviders.tsx

/**
 * @fileoverview ViteAppProviders component
 * @description Vite-specific app providers with lazy loading
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';

// Import virtual modules to populate globalThis._DNDEV_CONFIG_ before any components load
import 'virtual:env';
import 'virtual:themes';
import 'virtual:i18n-mapping';
import 'virtual:routes';
import 'virtual:assets';

import {
  AppConfigProvider,
  applyFirstVisitLanguage,
  getI18nInstance,
  getLanguageRouting,
  getUrlLanguage,
  LanguageNavigationProvider,
} from '@donotdev/core';
import type { AppProvidersProps, LanguageNavigate } from '@donotdev/core';

import { ViteStoresInitializer } from '../internal/initializers/ViteStoresInitializer';
import { NavigationProvider } from '../internal/providers/NavigationProvider';
import { SentryInitializer } from '../internal/providers/SentryInitializer';
import { useRouteDiscovery } from '../routing/useRouteDiscovery';
import { createAppRouter } from '../vite-routing/AppRoutes';

// ✅ LAZY LOAD: Everything that imports Radix UI or react-router-dom
const HelmetProvider = lazy(() =>
  import('react-helmet-async').then((m) => ({ default: m.HelmetProvider }))
);
// 🚨 CRITICAL: NavigationProvider must NOT be lazy loaded
// NavigationProvider uses React hooks (useEffect) and must load in the same chunk as React
// Lazy loading causes "Invalid hook call" errors because React's dispatcher is null when the chunk loads
// This has been tested - lazy loading NavigationProvider NEVER works, keep it eagerly imported
const FaviconHead = lazy(() =>
  import('../internal/layout/components/FaviconHead').then((m) => ({
    default: m.default,
  }))
);
const PerformanceHints = lazy(() =>
  import('../internal/layout/components/PerformanceHints').then((m) => ({
    default: m.default,
  }))
);

/** Language of the browser URL (prefix, else the default language). */
function currentUrlLanguage(): string {
  return getUrlLanguage(window.location.pathname);
}

/** Stop the history listener of a router replaced by a language switch. */
function useDisposeReplacedRouter(router: ReturnType<typeof createAppRouter>) {
  const previous = useRef(router);
  useEffect(() => {
    if (previous.current !== router) previous.current.dispose();
    previous.current = router;
  }, [router]);
}

/**
 * ViteAppProviders - Vite platform-specific app providers
 *
 * Clean provider hierarchy with configuration via context (no prop drilling).
 * Uses React Router v7 data router pattern (RouterProvider + createBrowserRouter).
 *
 * Provider hierarchy (outside router):
 * 1. AppConfigProvider (configuration context)
 * 2. SentryInitializer (error monitoring)
 * 3. ViteStoresInitializer (store setup)
 * 4. HelmetProvider (head management)
 * 5. FaviconHead (favicon configuration)
 * 6. NavigationProvider (RouterProvider with auto-abort)
 *
 * Provider hierarchy (inside router via RootLayout):
 * 7. QueryProviders (React Query)
 * 8. UIProviders (design system)
 * 9. AutoMetaTags (SEO)
 * 10. FrameworkReadySignal (framework initialization)
 * 11. Layout (application layout)
 * 12. ConsentBanner (cookie consent)
 * 13. PWAUpdateNotification (PWA updates)
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 *
 * @example
 * ```tsx
 * <ViteAppProviders
 * config={{ app: { name: 'My App' } }}
 * />
 * ```
 *
 * Note: HomePage.tsx in src/pages/ is automatically used for the root route "/"
 */
export function ViteAppProviders(props: AppProvidersProps) {
  const { config = {}, layout, children, customStores } = props;

  // Discover routes using the route discovery hook
  const routeGroups = useRouteDiscovery();

  // Create router instance using React Router v7 data router pattern
  // Virtual modules are loaded at module level (lines 20-26), so routes are available
  // HomePage.tsx is automatically assigned path "/" by RouteDiscovery convention
  // Memoized so the router instance is stable across re-renders (Item 86)
  // The router runs under the URL's language prefix (createAppRouter basename). A
  // language switch moves the URL to the other language's prefix and recreates the
  // router under it: client-side, no document reload.
  const [urlLanguage, setUrlLanguage] = useState(currentUrlLanguage);
  const router = useMemo(
    () => createAppRouter({ routeGroups, layout }),
    // urlLanguage: a new router (new basename) per URL language
    [routeGroups, layout, urlLanguage]
  );
  useDisposeReplacedRouter(router);

  // Back/forward across languages: the router of the other prefix takes over
  useEffect(() => {
    const onPopState = () => {
      // Same rule as a first visit (and as the Next proxy) for an unprefixed URL
      const routing = getLanguageRouting();
      applyFirstVisitLanguage(routing.languages, routing.defaultLanguage);
      const language = currentUrlLanguage();
      void getI18nInstance().changeLanguage(language);
      setUrlLanguage(language);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateToLanguage: LanguageNavigate = (url, language) => {
    window.history.pushState(null, '', url);
    void getI18nInstance().changeLanguage(language);
    setUrlLanguage(language);
  };

  return (
    <AppConfigProvider config={config} platform="vite">
      <SentryInitializer />
      <ViteStoresInitializer customStores={customStores}>
        <Suspense fallback={null}>
          <HelmetProvider>
            {/* Favicon - uses useFaviconConfig() internally */}
            <FaviconHead />

            {/* Performance hints - preconnects for faster third-party loads */}
            <PerformanceHints />

            {/* NavigationProvider uses RouterProvider with data router pattern */}
            {/* RootLayout (inside router config) provides QueryProviders, UIProviders, Layout, etc. */}
            <LanguageNavigationProvider navigate={navigateToLanguage}>
              <NavigationProvider router={router} />
            </LanguageNavigationProvider>
          </HelmetProvider>
        </Suspense>
      </ViteStoresInitializer>
    </AppConfigProvider>
  );
}
