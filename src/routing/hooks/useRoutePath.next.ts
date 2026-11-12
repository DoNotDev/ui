'use client';
// packages/ui/src/routing/hooks/useRoutePath.next.ts

/**
 * @fileoverview Next.js route path of the current URL
 * @description The pathname without its language prefix, read without the query string.
 *
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */

import { usePathname } from 'next/navigation';

import {
  getLanguageRouting,
  publicPathname,
  splitLanguagePath,
} from '@donotdev/core';

/**
 * Route path of the current URL: the pathname without its language prefix
 * (`/en/produits` → `/produits`). Reads the pathname only: safe in cached (static)
 * renders, where reading the query string (`useLocation().search`,
 * `useSearchParams`) moves the render to the browser up to the nearest Suspense
 * boundary. Use it whenever the query string is not needed. The server render of a
 * per-request page reads its internal pathname (`/<lang>/dndev-session/…`): dropped here, so
 * the server and the browser see the same path.
 *
 * @returns Route path, always starting with `/`
 *
 * @example
 * ```tsx
 * const path = useRoutePath();
 * const active = path === '/produits';
 * ```
 *
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */
export function useRoutePath(): string {
  return splitLanguagePath(
    publicPathname(usePathname() ?? '/'),
    getLanguageRouting()
  ).path;
}
