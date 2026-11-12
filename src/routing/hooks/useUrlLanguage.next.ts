'use client';
// packages/ui/src/routing/hooks/useUrlLanguage.next.ts

/**
 * @fileoverview Next.js language of the URL
 * @description The language of the current URL and the localized form of app paths
 * (default language at the root, others under `/<lang>`; see languagePath in
 * @donotdev/core). On the server a rewritten default-language page reads
 * `/<default>/…` and the browser reads `/…` (a per-request page: `/<lang>/dndev-session/…`,
 * dropped by publicPathname): both give the same language and paths, so the server
 * HTML and the hydration pass agree.
 *
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */

import { usePathname } from 'next/navigation';

import {
  getLanguageRouting,
  localizePath,
  publicPathname,
  splitLanguagePath,
} from '@donotdev/core';

/**
 * Language of the current URL: its prefix, else the default language.
 *
 * @returns Language code (`/en/produits` → `en`)
 *
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */
export function useUrlLanguage(): string {
  return splitLanguagePath(
    publicPathname(usePathname() ?? '/'),
    getLanguageRouting()
  ).language;
}

/**
 * Localize app paths in the current URL's language, for `href`s built outside `<Link>`.
 * `<Link path>` and `navigate()` already do it.
 *
 * @returns `(path) => url`: `/produits` → `/en/produits` on an English page
 *
 * @example
 * ```tsx
 * const localize = useLocalizedPath();
 * <a href={localize('/produits')}>…</a>
 * ```
 *
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */
export function useLocalizedPath(): (path: string) => string {
  const language = useUrlLanguage();
  const routing = getLanguageRouting();
  return (path: string) => localizePath(path, language, routing);
}
