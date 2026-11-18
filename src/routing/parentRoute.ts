// packages/ui/src/routing/parentRoute.ts

/**
 * @fileoverview Breadcrumb path rules
 * @description One rule for Breadcrumbs and form navigation: every cumulative
 * path prefix is a crumb, and a crumb links only when it is a known route.
 *
 * @version 0.1.0
 * @since 0.2.5
 * @author AMBROISE PARK Consulting
 */

/**
 * Cumulative prefixes of a pathname: `/a/b/c` → `['/a', '/a/b', '/a/b/c']`.
 *
 * @param pathname - App path (no language prefix)
 * @returns One entry per segment, in order
 */
export function getPathPrefixes(pathname: string): string[] {
  const prefixes: string[] = [];
  let current = '';
  for (const segment of pathname.split('/').filter(Boolean)) {
    current += `/${segment}`;
    prefixes.push(current);
  }
  return prefixes;
}

/**
 * Previous breadcrumb: the nearest parent prefix that is a known route, else home.
 * `/routines/abc` → `/routines`; `/reglages` → `/`.
 *
 * @param pathname - App path (no language prefix)
 * @param routePaths - Known route paths (what Breadcrumbs links)
 * @param homePath - Path when no parent route exists
 * @returns The path the previous breadcrumb links to
 */
export function getParentRoutePath(
  pathname: string,
  routePaths: ReadonlySet<string>,
  homePath = '/'
): string {
  const parents = getPathPrefixes(pathname).slice(0, -1);
  for (let index = parents.length - 1; index >= 0; index--) {
    const path = parents[index];
    if (path !== undefined && routePaths.has(path)) return path;
  }
  return homePath;
}
