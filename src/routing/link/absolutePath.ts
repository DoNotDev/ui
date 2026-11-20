// packages/ui/src/routing/link/absolutePath.ts

/**
 * @fileoverview Link target path
 * @description Path an internal `Link` navigates to.
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */

/**
 * Absolute app path (starts with `/`) so navigation never resolves relative to the current
 * URL; intentional relative paths (`./x`, `../x`) are kept.
 *
 * @param path - `Link` path
 * @returns `products` → `/products`; `/products`, `./x` unchanged
 */
export function absolutePath(path: string): string {
  return path.startsWith('/') || path.startsWith('.') ? path : `/${path}`;
}
