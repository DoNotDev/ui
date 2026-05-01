// packages/ui/src/providers/ViteAppProviders.tsx

/**
 * @fileoverview ViteAppProviders component
 * @description Vite-specific app providers with lazy loading
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { lazy, Suspense, useMemo } from 'react';

// Import virtual modules to populate globalThis._DNDEV_CONFIG_ before any components load
import 'virtual:env';
import 'virtual:themes';
import 'virtual:i18n-mapping';
import 'virtual:routes';
import 'virtual:assets';

import { AppConfigProvider } from '@donotdev/core';
import type { AppProvidersProps } from '@donotdev/core';

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
  const router = useMemo(
    () => createAppRouter({ routeGroups, layout }),
    [routeGroups, layout]
  );

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
            <NavigationProvider router={router} />
          </HelmetProvider>
        </Suspense>
      </ViteStoresInitializer>
    </AppConfigProvider>
  );
}
