'use client';
// packages/ui/src/routing/link/InternalLink.vite.tsx

/**
 * @fileoverview Vite internal link
 * @description `<a href>` to an app path, navigated client-side by react-router (`useNavigate`).
 * Resolved via the `vite-app` condition of `@donotdev/ui/routing/link`.
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */

import type { MouseEvent, ReactElement } from 'react';

// Platform-specific hooks via conditional exports (vite-app → hooks.vite)
import { useLocalizedPath, useNavigate } from '@donotdev/ui/routing/hooks';

import { absolutePath } from './absolutePath';
import type { InternalLinkProps } from './types';

/**
 * Internal link (Vite): renders `<a href>` in the current language and navigates with the
 * router on a plain left click. Modifier / non-left clicks keep the browser default (new tab).
 * `prefetch` has no effect (react-router has no prefetch).
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */
export function InternalLink({
  path,
  replace,
  prefetch: _prefetch,
  onClick,
  children,
  ...anchorProps
}: InternalLinkProps): ReactElement {
  const navigate = useNavigate();
  const localize = useLocalizedPath();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Honor browser native open-in-new-tab on modifier+click or non-left-click.
    // Without this, preventDefault() below would block the browser default,
    // and Ctrl/Cmd-click would silently navigate in the same tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      if (onClick) onClick(e);
      return; // browser handles new tab / new window
    }

    // Internal links: use framework navigation
    e.preventDefault();
    if (onClick) onClick(e);
    navigate(absolutePath(path), { replace });
  };

  return (
    <a href={localize(path)} onClick={handleClick} {...anchorProps}>
      {children}
    </a>
  );
}
