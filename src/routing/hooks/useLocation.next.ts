'use client';
// packages/ui/src/routing/hooks/useLocation.next.ts

/**
 * @fileoverview Next.js-specific location hook
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import {
  usePathname,
  useSearchParams as useNextSearchParams,
} from 'next/navigation';

export function useLocation() {
  const pathname = usePathname();
  const searchParams = useNextSearchParams();

  const searchString = searchParams.toString();
  const search = searchString ? `?${searchString}` : undefined;
  return {
    pathname: pathname || '/',
    search,
    hash: '',
    state: null,
  };
}
