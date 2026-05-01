'use client';
// packages/ui/src/routing/hooks/useSearchParams.next.ts

import { useSearchParams as useNextSearchParams } from 'next/navigation';

/**
 * Get current URL search parameters (read-only).
 * Returns a ReadonlyURLSearchParams instance directly (NOT a tuple).
 *
 * To modify search params, use `useNavigate()` with a query string
 * or `useQueryParams()` for a key-value API with defaults.
 *
 * @returns ReadonlyURLSearchParams instance with `.get()`, `.has()`, `.getAll()`, etc.
 *
 * @example
 * ```tsx
 * const searchParams = useSearchParams();
 * const page = searchParams.get('page');
 * const sort = searchParams.get('sort');
 * ```
 */
export function useSearchParams(): ReturnType<typeof useNextSearchParams> {
  return useNextSearchParams();
}
