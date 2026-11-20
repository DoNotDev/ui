'use client';
// packages/ui/src/routing/link/InternalLink.next.tsx

/**
 * @fileoverview Next.js internal link
 * @description `next/link` to an app path, so Next prefetches the route (viewport, hover) and
 * navigates client-side. Resolved via the default condition of `@donotdev/ui/routing/link`.
 *
 * @version 0.2.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */

import NextLink from 'next/link';
import type { ReactElement } from 'react';

import { useOverlayStore } from '@donotdev/core';
// Platform-specific hooks via conditional exports (default → hooks.next)
import { useLocalizedPath } from '@donotdev/ui/routing/hooks';

import { useAuthSafe } from '../../utils/useAuthSafe';
import { absolutePath } from './absolutePath';
import type { InternalLinkProps } from './types';

/**
 * Internal link (Next.js): renders next/link (a real `<a href>`) in the current language.
 * - `prefetch` true (default), guest: next/link's default (`auto`: static routes fully,
 *   dynamic routes up to the nearest `loading.js`; production only). Guests get the
 *   cached site tree, which `auto` prefetches in full.
 * - `prefetch` true, signed in: `prefetch={true}`, the full route of each visible link.
 *   Signed-in visitors get the per-request session tree (`dndev-session`, dynamic), which
 *   `auto` skips. Signed-in state is `useAuth('isAuthenticated')`: the request's cookie
 *   snapshot on the server and in the hydration pass, the provider's once ready. The
 *   anchor HTML does not depend on it (prefetch runs after mount): no hydration mismatch.
 * - `prefetch` false: no prefetch, signed in or not.
 * - Plain left click: client-side navigation, open overlays closed (same as `navigate()`).
 *   Modifier / middle clicks keep the browser default (new tab). An `onClick` calling
 *   `preventDefault()` cancels the navigation.
 *
 * @version 0.2.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */
export function InternalLink({
  path,
  replace,
  prefetch = true,
  children,
  ...anchorProps
}: InternalLinkProps): ReactElement {
  const localize = useLocalizedPath();
  const closeAll = useOverlayStore((state) => state.closeAll);
  const signedIn = useAuthSafe('isAuthenticated');

  return (
    <NextLink
      href={localize(absolutePath(path))}
      replace={replace}
      prefetch={!prefetch ? false : signedIn ? true : null}
      onNavigate={() => closeAll()}
      {...anchorProps}
    >
      {children}
    </NextLink>
  );
}
