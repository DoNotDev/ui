'use client';
// packages/ui/src/routing/hooks/useLocation.next.ts

/**
 * @fileoverview Next.js-specific location hook
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useSearchParams as useNextSearchParams } from 'next/navigation';

import { useRoutePath } from './useRoutePath.next';

/**
 * Current location, route-relative: `pathname` has no language prefix (`/en/produits`
 * → `/produits`), so route matching, breadcrumbs and guards see app paths.
 *
 * Reads the query string (`search`): in a cached (static) render that moves the
 * render to the browser up to the nearest Suspense boundary. Use `useRoutePath()`
 * when only the path is needed.
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function useLocation() {
  const pathname = useRoutePath();
  const searchParams = useNextSearchParams();

  const searchString = searchParams.toString();
  const search = searchString ? `?${searchString}` : undefined;
  return {
    pathname,
    search,
    hash: '',
    state: null,
  };
}
