'use client';
// packages/ui/src/routing/hooks/useSearchParams.vite.ts

import { useSearchParams as useRouterSearchParams } from 'react-router-dom';

/**
 * Get current URL search parameters (read-only).
 * Returns a URLSearchParams instance directly (NOT a tuple).
 *
 * To modify search params, use `useNavigate()` with a query string
 * or `useQueryParams()` for a key-value API with defaults.
 *
 * @returns URLSearchParams instance with `.get()`, `.has()`, `.getAll()`, etc.
 *
 * @example
 * ```tsx
 * const searchParams = useSearchParams();
 * const page = searchParams.get('page');
 * const sort = searchParams.get('sort');
 * ```
 */
export function useSearchParams(): URLSearchParams {
  return useRouterSearchParams()[0];
}
