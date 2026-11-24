// packages/ui/src/routing/parentRoute.ts

/**
 * @fileoverview Parent page of a URL
 * @description The forms' parent path (cancel / after-save navigation): the nearest
 * ancestor of the page, by the ancestor chain the Breadcrumbs and the BreadcrumbList
 * JSON-LD read (`routeAncestors` in `@donotdev/core`: URL prefixes that are routes,
 * PageMeta `parent`).
 *
 * @version 0.2.0
 * @since 0.2.5
 * @author AMBROISE PARK Consulting
 */

import { routeAncestors } from '@donotdev/core';
import type { AncestorRoute } from '@donotdev/core';

/**
 * Previous breadcrumb: the page's nearest ancestor (`routeAncestors`), else home.
 * `/routines/abc` → `/routines`; `/reglages` → `/`; `/produits/serum` with PageMeta
 * `parent: '/catalogue'` → `/catalogue`.
 *
 * @param pathname - App path (no language prefix)
 * @param routes - Known routes, with their PageMeta (what Breadcrumbs links)
 * @param homePath - Path when the page has no ancestor
 * @returns The path the previous breadcrumb links to
 */
export function getParentRoutePath(
  pathname: string,
  routes: readonly AncestorRoute[],
  homePath = '/'
): string {
  return routeAncestors(pathname, routes).at(-1)?.path ?? homePath;
}
