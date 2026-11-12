'use client';
// packages/ui/src/routing/hooks/useUrlLanguage.vite.ts

/**
 * @fileoverview Vite language of the URL
 * @description The router runs under the language prefix as its basename
 * (createAppRouter), so route paths never carry it. This reads the language from that
 * basename and localizes app paths for `href`s.
 *
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */

import { useHref } from 'react-router-dom';

import {
  getLanguageRouting,
  localizePath,
  splitLanguagePath,
} from '@donotdev/core';

/**
 * Language of the current URL: the router basename's language, else the default.
 *
 * @returns Language code
 *
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */
export function useUrlLanguage(): string {
  return splitLanguagePath(useHref('/'), getLanguageRouting()).language;
}

/**
 * Localize app paths in the current URL's language, for `href`s built outside `<Link>`.
 * `<Link path>` and `navigate()` already do it.
 *
 * @returns `(path) => url`: `/produits` → `/en/produits` on an English page
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
