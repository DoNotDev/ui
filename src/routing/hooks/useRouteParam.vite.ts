'use client';
// packages/ui/src/routing/hooks/useRouteParam.vite.ts

/**
 * @fileoverview useRouteParam hook - Vite/React Router implementation
 * @description Helper hook to safely extract a single route parameter as a string
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useParams } from './useParams.vite';

/**
 * Safely extract a route parameter as a string
 *
 * Handles the fact that useParams can return string | string[] | undefined.
 * For standard path parameters (not catch-all routes), this will always be a string.
 *
 * @param paramName - Name of the route parameter
 * @returns The parameter value as a string, or undefined if not present
 *
 * @example
 * ```tsx
 * // Route: /product/:id
 * const id = useRouteParam('id'); // string | undefined
 * if (!id) return <NotFound />;
 * ```
 */
export function useRouteParam(paramName: string): string | undefined {
  const params = useParams();
  const value = params[paramName];

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return undefined;
}
