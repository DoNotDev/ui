// packages/ui/src/routing/useRouteDiscovery.ts

/**
 * @fileoverview Route Discovery Hooks - Store-Integrated Navigation Data Access
 * @description Enhanced route discovery with navigation store integration
 *
 * Provides route discovery functionality with seamless integration to the navigation
 * store for optimal performance and data consistency. These hooks serve as the bridge
 * between the virtual route module system and the store-based navigation architecture.
 *
 * Key features:
 * - Integration with navigation store for caching
 * - Auth-filtered route access via store
 * - Route grouping and organization
 * - Performance optimization through store-level caching
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 *
 * @example
 * ```tsx
 * const routes = useAccessibleNavigationRoutes();
 * ```
 */

import { useMemo } from 'react';
import type { JSX } from 'react';
import type { ReactNode } from 'react';

import {
  useNavigationStore,
  getRoutes,
  getRouteManifest,
} from '@donotdev/core';
import type {
  RoutesPluginConfig,
  NavigationRoute as CoreNavigationRoute,
} from '@donotdev/core';

import { useAuthSafe } from '../utils/useAuthSafe';

// Use the single source of truth
type RouteData = RoutesPluginConfig['mapping'][0];

/**
 * Route information interface for discovered routes
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface RouteInfo {
  /** Route path (e.g., '/dashboard', '/demo/new') */
  path: string;
  /** Human-readable label for navigation */
  label: string;
  /** Optional icon identifier or component for navigation */
  icon?: string | ReactNode;
  /** Component reference as string (lazy import expression for Vite) */
  component: string;
  /** Absolute import path (for Next.js and monorepo support) */
  importPath: string;
  /** Export name for named exports (e.g., 'HomePage', 'AboutPage') */
  exportName?: string;
  /** Authentication configuration for the route */
  auth?: boolean | Record<string, unknown>;
  /** Additional route metadata */
  meta?: unknown;
}

/**
 * Group of related routes organized by entity/domain
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface RouteGroup {
  /** Group label for navigation sections */
  label: string;
  /** Optional icon for the group */
  icon?: JSX.Element;
  /** Routes belonging to this group */
  routes: RouteInfo[];
}

/**
 * Navigation route - re-exported from @donotdev/core (Item 90)
 * Core's version is the single source of truth with richer fields.
 */
export type NavigationRoute = CoreNavigationRoute;

/**
 * Hook that provides auto-discovered routes from virtual module system
 *
 * This hook provides raw route discovery data from the virtual module system
 * without authentication filtering. It serves as the foundation for other
 * route-related hooks.
 *
 * Performance:
 * - Results are memoized to prevent unnecessary re-computation
 * - No authentication dependencies to avoid re-renders
 * - Integrates with navigation store for enhanced caching
 *
 * @returns Array of route groups organized by entity/domain
 *
 * @example
 * ```tsx
 * function RouteDebugger() {
 *   const allRoutes = useRouteDiscovery();
 *   return <div>Total routes: {allRoutes.flatMap(g => g.routes).length}</div>;
 * }
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function useRouteDiscovery(): RouteGroup[] {
  return useMemo(() => {
    try {
      const routeData = getRoutes();

      if (!routeData || routeData.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[useRouteDiscovery] No routes found - ensure you have *Page.tsx files in src/'
          );
        }
        return [];
      }

      const groupedRoutes = groupRoutes(routeData);

      return groupedRoutes;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useRouteDiscovery] Error discovering routes:', error);
        console.warn(
          '[useRouteDiscovery] No routes found - ensure you have *Page.tsx files in src/'
        );
      }
      return [];
    }
  }, []);
}

/**
 * Hook that provides routes filtered by user access permissions
 *
 * Enhanced version that integrates with navigation store for optimal performance
 * and caching. Uses store-level filtering with auth state caching to minimize
 * re-computation across multiple component uses.
 *
 * @returns Array of route groups filtered by user permissions
 *
 * @example
 * ```tsx
 * function AdminRoutesList() {
 *   const accessibleGroups = useAccessibleRoutes();
 *   return (
 *     <div>
 *       {accessibleGroups.map(group => (
 *         <RouteGroup key={group.label} group={group} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function useAccessibleRoutes(): RouteGroup[] {
  const allGroups = useRouteDiscovery();
  const user = useAuthSafe('user');

  return useMemo(() => {
    return allGroups
      .map((group) => ({
        ...group,
        routes: group.routes.filter((route) => {
          // Use same filtering logic as AuthGuard for consistency (Item 88)
          if (route.auth === false) return true;
          if (route.auth === true) return !!user;
          if (typeof route.auth === 'object' && route.auth.required) {
            return !!user;
          }
          return true;
        }),
      }))
      .filter((group) => group.routes.length > 0);
  }, [allGroups, user]);
}

/**
 * Hook for components that need auth-filtered navigation routes (Store-Enhanced)
 *
 * Provides auth-filtered navigation routes with store integration for optimal
 * performance. This is the recommended hook for UI components that need
 * navigation data with authentication filtering.
 *
 * Features:
 * - Store-level caching by auth state
 * - Automatic updates when auth changes
 * - Consistent filtering logic with AuthGuard
 * - Optimized for multiple component usage
 *
 * @returns Array of navigation routes filtered by user permissions
 *
 * @example
 * ```tsx
 * function Sidebar() {
 *   const routes = useAccessibleNavigationRoutes();
 *   return <SidebarMenu routes={routes} />;
 * }
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function useAccessibleNavigationRoutes(): NavigationRoute[] {
  const user = useAuthSafe('user');
  return useMemo(() => {
    const filteredRoutes = useNavigationStore.getState().getFilteredRoutes({
      authenticated: !!user,
      role: user?.role || 'user',
    });
    return filteredRoutes.map((route) => ({
      path: route.path,
      label: route.label,
      icon: route.icon,
      meta: route.meta,
    }));
  }, [user]);
}

/**
 * Hook that returns all discovered routes as a flat list
 *
 * Provides all route information without grouping or filtering.
 * Useful for route analytics, debugging, or admin interfaces.
 *
 * @returns Flat array of all route information
 *
 * @example
 * ```tsx
 * function RouteAnalytics() {
 *   const allRoutes = useAllRoutes();
 *   return <div>Total discovered routes: {allRoutes.length}</div>;
 * }
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function useAllRoutes() {
  const groups = useRouteDiscovery();
  return useMemo(() => {
    return groups.flatMap((group) => group.routes);
  }, [groups]);
}

/**
 * Hook that returns route manifest information from virtual module
 *
 * Provides metadata about the route discovery process including statistics
 * and build-time information. Useful for debugging and development tools.
 *
 * @returns Route manifest with statistics and metadata, or null if unavailable
 *
 * @example
 * ```tsx
 * function RouteManifestDisplay() {
 *   const manifest = useRouteManifest();
 *   if (!manifest) return <div>No manifest available</div>;
 *
 *   return (
 *     <div>
 *       <p>Total routes: {manifest.totalRoutes}</p>
 *       <p>Auth required: {manifest.authRequired}</p>
 *       <p>Generated: {manifest.generatedAt}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function useRouteManifest() {
  return useMemo(() => {
    try {
      return getRouteManifest();
    } catch {
      return null;
    }
  }, []);
}

// ===== HELPER FUNCTIONS =====

/**
 * Groups discovered routes by entity/domain for organized navigation
 *
 * Takes raw route data from the virtual module system and organizes it into
 * logical groups based on entity names extracted from route paths or metadata.
 *
 * Features:
 * - Automatic entity extraction from route paths
 * - Smart defaults for missing metadata
 * - Comprehensive route inclusion regardless of configuration completeness
 * - Organized navigation structure for UI components
 *
 * @param routes - Raw route data from virtual module
 * @returns Organized route groups with labels and route collections
 */
function groupRoutes(routes: RouteData[]): RouteGroup[] {
  const groups = new Map<string, RouteGroup>();

  routes.forEach((route) => {
    // Ensure path is a string - handle cases where it might be an object
    const pathString =
      typeof route.path === 'string' ? route.path : String(route.path);

    // Skip invalid routes
    if (!pathString || pathString === 'undefined' || pathString === 'null') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[groupRoutes] Skipping invalid route:', route);
      }
      return;
    }

    // Extract entity with fallback to path-based detection
    const entity =
      route.meta?.entity || extractEntityFromPath(pathString) || 'other';

    const routeInfo: RouteInfo = {
      path: pathString, // Ensure path is always a string
      label: route.meta?.title || generateLabel(pathString),
      icon: route.meta?.icon, // Read icon from PageMeta
      component: route.component,
      importPath: route.importPath,
      exportName: route.exportName, // Pass through export name for named exports
      auth: route.auth,
      meta: route.meta,
    };

    if (!groups.has(entity)) {
      groups.set(entity, {
        label: entity.charAt(0).toUpperCase() + entity.slice(1),
        routes: [],
      });
    }
    groups.get(entity)?.routes.push(routeInfo);
  });

  return Array.from(groups.values());
}

/**
 * Extracts entity name from route path for grouping purposes
 *
 * Analyzes route path structure to determine the entity or domain that the
 * route belongs to, used for organizing routes into logical navigation groups.
 *
 * @param path - Route path (e.g., '/products/list')
 * @returns Entity name (e.g., 'products') or null if no entity found
 */
function extractEntityFromPath(path: string): string | null {
  const segments = path.split('/').filter(Boolean);
  return segments[0] || null;
}

/**
 * Generates human-readable label from route path
 *
 * Creates display-friendly labels from route paths by transforming path
 * segments into properly capitalized words suitable for navigation menus.
 *
 * @param path - Route path to generate label from
 * @returns Formatted label for display in navigation
 */
function generateLabel(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];

  if (!lastSegment) return 'Home';

  return lastSegment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
