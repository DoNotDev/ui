// packages/ui/src/vite-routing/AppRoutes.tsx

/**
 * @fileoverview AppRoutes - Professional Route Configuration System
 * @description Enterprise-grade routing with automatic discovery, authentication, and lazy loading
 *
 * AppRoutes provides a complete routing solution that automatically discovers page components
 * from the filesystem and integrates them with authentication, lazy loading, and error handling.
 * This component serves as the core routing engine for DoNotDev applications.
 *
 * ## Architecture
 *
 * The routing system uses React Router v7 data router pattern (createBrowserRouter):
 * - **Root Route**: HomePage.tsx automatically assigned path "/" by convention
 * - **Discovered Routes**: Auto-discovered from *Page.tsx files (lazy-loaded)
 * - **404 Route**: Wildcard catch-all for unmatched paths
 *
 * ## Key Features
 *
 * - **Automatic Route Discovery**: Scans src/pages/*.tsx files and generates routes
 * - **Authentication Integration**: AuthGuard wraps all routes with configurable access control
 * - **Lazy Loading**: Discovered routes are code-split for optimal performance
 * - **SEO Optimization**: Preserves meta information from discovered routes
 * - **Error Handling**: Built-in 404 handling and loading states
 * - **Type Safety**: Full TypeScript support with comprehensive interfaces
 * - **Data Router**: Modern React Router v7 pattern with native scroll restoration
 *
 * ## Performance Optimizations
 *
 * - **Code Splitting**: Each route is lazy-loaded to reduce initial bundle size
 * - **Caching**: Lazy components are cached to prevent recreation
 * - **Suspense Boundaries**: Proper loading states prevent UI flicker
 * - **Native Scroll Restoration**: Built-in scroll position memory
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 * @license MIT
 *
 * @example
 * ```tsx
 * // Create router with landing page
 * const router = createAppRouter(HomePage);
 *
 * // Use with RouterProvider
 * <RouterProvider router={router} />
 * ```
 */

import { lazy, Suspense, useLayoutEffect } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import type { PageAuth, LayoutConfig, LayoutPreset } from '@donotdev/core';
import { useLayout } from '@donotdev/core';

import { Spinner } from '@donotdev/components';

import { RootLayout } from './RootLayout';
import { AuthGuard } from '../routing/AuthGuard';

import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import type { RouteObject } from 'react-router-dom';

/** Lazy-loadable page component factory or Vite glob string reference */
type PageComponentFactory =
  | (() => Promise<{ default: ComponentType }>)
  | string;

// Cache lazy components to prevent recreation and infinite loops
const lazyComponentCache = new Map<
  string,
  LazyExoticComponent<ComponentType>
>();

/**
 * NotFoundPage component with lazy loading and caching
 * Only loads when actually needed (404 route)
 */
function NotFoundPage() {
  const cacheKey = '404';

  // Use the same caching mechanism as dynamic routes
  if (!lazyComponentCache.has(cacheKey)) {
    lazyComponentCache.set(
      cacheKey,
      lazy(() => import('../routing/404'))
    );
  }

  const LazyNotFoundPage = lazyComponentCache.get(cacheKey)!;

  return (
    <Suspense fallback={<Spinner overlay />}>
      <LazyNotFoundPage />
    </Suspense>
  );
}

/**
 * LazyRoute - Optimized Component Loader
 *
 * Provides efficient lazy loading with caching to prevent component recreation
 * and infinite loops. Uses the component function directly from route discovery.
 *
 * @param component - Lazy component function from route discovery
 * @param path - Route path for caching
 * @returns Lazy-loaded React component
 *
 * @example
 * ```tsx
 * <LazyRoute component={route.component} path={route.path} />
 * ```
 */
const LazyRoute = ({
  component,
  path,
}: {
  component: PageComponentFactory;
  path: string;
}) => {
  if (!lazyComponentCache.has(path)) {
    lazyComponentCache.set(
      path,
      lazy(component as () => Promise<{ default: ComponentType }>)
    );
  }
  const Component = lazyComponentCache.get(path)!;
  return (
    <Suspense fallback={<Spinner overlay />}>
      <Component />
    </Suspense>
  );
};

/** Extract preset from route meta (meta is unknown at the interface level) */
function getRoutePreset(meta: unknown): LayoutPreset | undefined {
  if (meta && typeof meta === 'object' && 'preset' in meta) {
    const preset = (meta as { preset?: unknown }).preset;
    return typeof preset === 'string' ? (preset as LayoutPreset) : undefined;
  }
  return undefined;
}

/** Extract hideBreadcrumbs from route meta */
function getRouteHideBreadcrumbs(meta: unknown): boolean | undefined {
  if (meta && typeof meta === 'object' && 'hideBreadcrumbs' in meta) {
    const hide = (meta as { hideBreadcrumbs?: unknown }).hideBreadcrumbs;
    return typeof hide === 'boolean' ? hide : undefined;
  }
  return undefined;
}

/**
 * LayoutRoute - Per-route preset switcher
 *
 * Wraps route elements to apply the route's `meta.preset` override.
 * On mount, sets the route preset override in the theme store.
 * On unmount (navigation away), the next route's LayoutRoute sets its own value.
 * Routes without a preset pass null, falling back to the app's default.
 *
 * Uses useLayoutEffect to apply before paint, avoiding visual flash.
 */
const LayoutRoute = ({
  preset,
  hideBreadcrumbs,
  children,
}: {
  preset: LayoutPreset | undefined;
  hideBreadcrumbs: boolean | undefined;
  children: ReactNode;
}) => {
  const setRoutePresetOverride = useLayout('setRoutePresetOverride');
  const setRouteHideBreadcrumbs = useLayout('setRouteHideBreadcrumbs');

  useLayoutEffect(() => {
    // Set route override (or null to clear and use app default)
    setRoutePresetOverride(preset ?? null);
    setRouteHideBreadcrumbs(hideBreadcrumbs ?? false);
  }, [
    preset,
    hideBreadcrumbs,
    setRoutePresetOverride,
    setRouteHideBreadcrumbs,
  ]);

  return <>{children}</>;
};

/**
 * Parse auth configuration to PageAuth | false for AuthGuard
 *
 * Handles various auth configurations from route discovery:
 * - boolean true: Convert to { required: true }
 * - boolean false: Return false (public)
 * - PageAuth object: Return as-is
 * - function: Invalid config, default to public
 * - undefined/null: Default to public
 *
 * @param auth - Auth configuration from route discovery
 * @returns Clean PageAuth or false for AuthGuard
 */
function parseAuthConfig(
  auth: boolean | PageAuth | null | undefined
): PageAuth | false {
  if (typeof auth === 'boolean') {
    return auth ? { required: true } : false;
  }
  if (typeof auth === 'object' && auth !== null) {
    return auth; // Return PageAuth object as-is
  }
  return false; // Default to public
}

/**
 * Route group from useRouteDiscovery
 */
export interface RouteGroup {
  label: string;
  icon?: unknown;
  routes: Array<RouteGroupEntry>;
}

/** Minimal route entry shape accepted by createAppRouter */
export interface RouteGroupEntry {
  path: string;
  component: PageComponentFactory;
  auth?: boolean | PageAuth;
  label?: string;
  importPath?: string;
  exportName?: string;
  meta?: unknown;
  icon?: unknown;
}

/**
 * Options for createAppRouter
 */
interface CreateAppRouterOptions {
  /** Route groups from useRouteDiscovery() */
  routeGroups: RouteGroup[];
  /** Optional base URL for all locations */
  basename?: string;
  /** Optional layout configuration */
  layout?: LayoutConfig;
}

/**
 * createAppRouter - Router Factory Function
 *
 * Creates a configured React Router instance with automatic route discovery,
 * authentication, lazy loading, and error handling.
 *
 * This factory function replaces the component-based approach with React Router v7's
 * data router pattern (createBrowserRouter). It discovers routes at creation time
 * and returns a router instance ready for use with RouterProvider.
 *
 * Features:
 * - Automatic route discovery from filesystem
 * - Lazy loading with code splitting
 * - Authentication integration via AuthGuard
 * - SEO-friendly root route
 * - Native scroll restoration
 * - Optional layout wrapper integration
 *
 * @param options - Router configuration options
 * @returns Configured router instance for RouterProvider
 *
 * @example
 * ```tsx
 * const groups = useRouteDiscovery();
 * const router = createAppRouter({
 *   routeGroups: groups
 * });
 * <RouterProvider router={router} />
 * ```
 *
 * @example
 * ```tsx
 * // With basename and layout config
 * const groups = useRouteDiscovery();
 * const router = createAppRouter({
 *   routeGroups: groups,
 *   basename: '/app',
 *   layout: { header: () => <CustomHeader /> }
 * });
 * <RouterProvider router={router} />
 * ```
 */
export function createAppRouter(options: CreateAppRouterOptions) {
  const { routeGroups, basename, layout } = options;

  // Find HomePage route (path "/")
  const allRoutes = routeGroups.flatMap((group) => group.routes);
  const homePageRoute = allRoutes.find((route) => route.path === '/');

  if (!homePageRoute) {
    throw new Error(
      'No HomePage.tsx found. Create src/pages/HomePage.tsx to define the root route.'
    );
  }

  // Pre-parse auth configs for all routes
  const routesWithParsedAuth = allRoutes.map((route) => ({
    ...route,
    parsedAuth: parseAuthConfig(route.auth),
  }));

  // Build route configuration
  const routeConfig: RouteObject[] = [
    {
      /** Root route - HomePage.tsx is automatically assigned path "/" by convention */
      path: '/',
      element: <RootLayout layout={layout} />,
      children: [
        {
          /** HomePage route - lazy loaded, public (no AuthGuard).
           *  Auth config on HomePage is intentionally ignored — use a different page as entry. */
          index: true,
          element: (() => {
            if (
              homePageRoute.auth &&
              typeof window !== 'undefined' &&
              import.meta.env.DEV
            ) {
              console.warn(
                '[DoNotDev] HomePage has auth config but the index route is always public. ' +
                  'Auth config on HomePage is ignored. Use a different page as your protected entry point.'
              );
            }
            return (
              <LayoutRoute
                preset={getRoutePreset(homePageRoute.meta)}
                hideBreadcrumbs={getRouteHideBreadcrumbs(homePageRoute.meta)}
              >
                <LazyRoute
                  component={homePageRoute.component}
                  path={homePageRoute.path}
                />
              </LayoutRoute>
            );
          })(),
        },
        /** All other routes are discovered and rendered here */
        ...routesWithParsedAuth
          .filter((route) => route.path !== '/')
          .map((route) => ({
            path: route.path.startsWith('/') ? route.path.slice(1) : route.path,
            element:
              route.parsedAuth === false ? (
                <LayoutRoute
                  preset={getRoutePreset(route.meta)}
                  hideBreadcrumbs={getRouteHideBreadcrumbs(route.meta)}
                >
                  <LazyRoute component={route.component} path={route.path} />
                </LayoutRoute>
              ) : (
                <LayoutRoute
                  preset={getRoutePreset(route.meta)}
                  hideBreadcrumbs={getRouteHideBreadcrumbs(route.meta)}
                >
                  <AuthGuard auth={route.parsedAuth}>
                    <LazyRoute component={route.component} path={route.path} />
                  </AuthGuard>
                </LayoutRoute>
              ),
          })),

        // 404 catch-all route (must be last)
        {
          path: '*',
          element: <NotFoundPage />,
        },
      ],
    },
  ];

  // Create and return router instance
  return createBrowserRouter(routeConfig, { basename });
}
