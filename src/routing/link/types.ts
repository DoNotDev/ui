// packages/ui/src/routing/link/types.ts

/**
 * @fileoverview Platform link types
 * @description Props of the platform anchor `Link` renders for internal paths
 * (`InternalLink`: next/link on Next.js, react-router navigation on Vite).
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */

import type { AnchorHTMLAttributes, ReactNode } from 'react';

/**
 * Props of `InternalLink`: an anchor to an app path, rendered as a real `<a href>`.
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */
export interface InternalLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** App path (`/produits`): the link uses the current language's URL */
  path: string;
  /** Replace the current history entry instead of pushing one */
  replace?: boolean;
  /**
   * Next.js: `true` (default) prefetches with next/link's default for guests and the full
   * route for signed-in visitors; `false` disables prefetching. Vite: ignored
   */
  prefetch?: boolean;
  children?: ReactNode;
}
