// packages/ui/src/internal/providers/NavigationProvider.tsx

/**
 * @fileoverview NavigationProvider - RouterProvider with Auto-Abort
 * @description Wraps RouterProvider with automatic request cancellation and overlay closing on navigation
 *
 * This provider uses React Router v7's data router pattern (RouterProvider + createBrowserRouter).
 * It automatically aborts pending requests and closes overlays when the user navigates to a new route,
 * preventing memory leaks and race conditions.
 *
 * 🚨 CRITICAL: This component must NOT be lazy loaded
 * - Uses React hooks (useEffect) and must load in the same chunk as React
 * - Lazy loading causes "Invalid hook call" errors because React's dispatcher is null when chunk loads
 * - Must be eagerly imported in ViteAppProviders to ensure React is available
 *
 * For current path/location, use `useLocation()` from '@donotdev/ui' directly.
 * For route discovery/menus, use NavigationStore hooks directly.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 *
 * @example
 * ```tsx
 * const router = createAppRouter(HomePage);
 * <NavigationProvider router={router}>
 * <DnDevLayout />
 * </NavigationProvider>
 * ```
 */

import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { RouterProvider } from 'react-router-dom';
import type { createBrowserRouter } from 'react-router-dom';

import { useAbortControllerStore, useOverlayStore } from '@donotdev/core';

// NOTE: abortAll/closeAll are accessed via getState() inside the effect to avoid
// Zustand action-in-deps bug (selectors cause re-subscriptions on every store update).

/**
 * Router type from createBrowserRouter
 */
type AppRouter = ReturnType<typeof createBrowserRouter>;

/**
 * NavigationProvider props
 */
interface NavigationProviderProps {
  /** Router instance from createAppRouter() */
  router: AppRouter;
  /** Optional children (for compatibility, but RouterProvider doesn't use them) */
  children?: ReactNode;
}

/**
 * NavigationProvider - RouterProvider wrapper with auto-abort
 *
 * Automatically cancels pending requests and closes overlays when navigating.
 * Uses React Router v7's data router pattern with navigation subscription.
 *
 * @param props - NavigationProvider props
 * @returns RouterProvider with auto-abort functionality
 *
 * @example
 * ```tsx
 * const router = createAppRouter(HomePage, '/app');
 * <NavigationProvider router={router}>
 * <DnDevLayout />
 * </NavigationProvider>
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function NavigationProvider({ router }: NavigationProviderProps) {
  useEffect(() => {
    // Subscribe to navigation events using router.subscribe()
    // This replaces the useLocation() + useEffect pattern from the old implementation
    const unsubscribe = router.subscribe(() => {
      // When navigation occurs, abort all pending requests and close overlays
      // This prevents memory leaks and race conditions
      useAbortControllerStore.getState().abortAll();
      useOverlayStore.getState().closeAll();
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [router]);

  // RouterProvider manages its own children from the router configuration
  // No need to render children prop (kept for backwards compatibility)
  return <RouterProvider router={router} />;
}
