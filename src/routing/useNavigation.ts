// packages/ui/src/routing/useNavigation.ts

/**
 * @fileoverview Navigation Hooks - Clean and Simple
 * @description Only 2 hooks: dumb navigation + smart auth-filtered navigation
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useMemo } from 'react';

import type { NavigationRoute } from '@donotdev/core';
import { useNavigationStore } from '@donotdev/core';
import { USER_ROLES } from '@donotdev/core';
// Platform-specific hooks via conditional exports
import { useLocation } from '@donotdev/ui/routing/hooks';

import { useAuthSafe } from '../utils/useAuthSafe';

/**
 * Enhanced navigation item interface for UI components
 */
export interface NavigationItem extends NavigationRoute {
  /** Whether this item is currently active based on current route */
  isActive: boolean;
  /** Whether this item has child routes */
  hasChildren: boolean;
  /** Nested child navigation items */
  children?: NavigationItem[];
}

/**
 * Smart navigation hook with auth filtering
 *
 * Use this for UI menus, sidebars, and navigation components that should
 * only show routes the user can access.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 * @returns Array of navigation items filtered by auth state
 *
 * @example
 * ```tsx
 * function SidebarMenu() {
 *   const menuItems = useNavigationItems();
 *   return <nav>{menuItems.map(item => <MenuItem key={item.path} item={item} />)}</nav>;
 * }
 * ```
 */
export function useNavigationItems(): NavigationItem[] {
  const location = useLocation();

  // Get auth state - hooks must be called at top level
  const user = useAuthSafe('user');
  const authenticated = !!user;
  const role = user?.role || USER_ROLES.GUEST;

  // Use Zustand selector for proper caching - only re-runs when auth state changes
  const filteredRoutes = useNavigationStore((state) => {
    // Guard against undefined state during initialization
    if (!state || typeof state.getFilteredRoutes !== 'function') {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[useNavigationItems] Navigation store not initialized, returning empty routes'
        );
      }
      return [];
    }
    return state.getFilteredRoutes({
      authenticated,
      role,
    });
  });

  return useMemo(() => {
    // Ensure filteredRoutes is always an array
    if (!Array.isArray(filteredRoutes)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[useNavigationItems] filteredRoutes is not an array:',
          filteredRoutes
        );
      }
      return [];
    }

    return filteredRoutes
      .map((route) => ({
        ...route,
        isActive: isRouteActive(route.path, location.pathname),
        hasChildren: false,
        children: undefined,
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
      ); // Alphabetical sorting by label
  }, [filteredRoutes, location.pathname]);
}

/**
 * Resolves a single navigation item from the store by path.
 *
 * Returns `undefined` if the path is not registered or the user lacks access.
 * Use this to compose a standalone Button-style nav link without reaching for
 * a full NavigationMenu.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 *
 * @example
 * ```tsx
 * const route = useNavigationRoute('/pricing');
 * if (!route) return null;
 * return (
 *   <Button
 *     variant="ghost"
 *     display={DISPLAY.AUTO}
 *     icon={<Icon icon={route.icon} fallback={LinkIcon} />}
 *     render={({ children, ...props }) => (
 *       <Link path={route.path} {...props}>{children}</Link>
 *     )}
 *   >
 *     {route.label}
 *   </Button>
 * );
 * ```
 */
export function useNavigationRoute(path: string): NavigationItem | undefined {
  const items = useNavigationItems();
  return useMemo(() => items.find((item) => item.path === path), [items, path]);
}

// ===== HELPER FUNCTIONS =====

/**
 * Determines if a route path is currently active
 */
function isRouteActive(routePath: string, currentPath: string): boolean {
  // Exact match for root path to prevent false positives
  if (routePath === '/') {
    return currentPath === '/';
  }

  // Exact match first
  if (currentPath === routePath) {
    return true;
  }

  // Prefix match for nested routes, but ensure it's followed by a separator
  return currentPath.startsWith(routePath + '/');
}
