'use client';
// packages/ui/src/routing/hooks/useQueryParams.next.ts

/**
 * @fileoverview Next.js-specific useQueryParams hook
 * @description Query parameters hook with setter functionality for App Router
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useCallback } from 'react';

import { useLocation } from './useLocation.next';
import { useNavigate } from './useNavigate.next';
import { useSearchParams } from './useSearchParams.next';

/**
 * Platform-agnostic useQueryParams hook
 *
 * Provides easy access to query parameters with setter functionality
 *
 * @returns Object with query parameters and setter functions
 *
 * @example
 * ```tsx
 * const { query, setQuery, removeQuery } = useQueryParams();
 *
 * // Get a query parameter
 * const page = query.get('page');
 *
 * // Set a query parameter
 * setQuery('page', '2');
 *
 * // Remove a query parameter
 * removeQuery('page');
 * ```
 */
export function useQueryParams() {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const setQuery = useCallback(
    (key: string, value: string) => {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set(key, value);

      const newSearch = newParams.toString();
      const pathname = location.pathname || '/';
      const newUrl = `${pathname}${newSearch ? `?${newSearch}` : ''}`;

      navigate(newUrl);
    },
    [searchParams, navigate, location.pathname]
  );

  const removeQuery = useCallback(
    (key: string) => {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete(key);

      const newSearch = newParams.toString();
      const pathname = location.pathname || '/';
      const newUrl = `${pathname}${newSearch ? `?${newSearch}` : ''}`;

      navigate(newUrl);
    },
    [searchParams, navigate, location.pathname]
  );

  const clearQueries = useCallback(() => {
    const pathname = location.pathname || '/';
    navigate(pathname);
  }, [navigate, location.pathname]);

  return {
    query: searchParams,
    setQuery,
    removeQuery,
    clearQueries,
  };
}
