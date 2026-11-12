'use client';
// packages/ui/src/routing/SignedInRedirect.tsx

/**
 * @fileoverview SignedInRedirect component
 * @description Client side of PageMeta `signedInRedirect`: sends a signed-in visitor
 * of the page to another path. The generated Next proxy redirects before render when
 * it can read the session cookie; this covers sign-ins on the page itself (no server
 * request) and sessions the server cannot read.
 *
 * @version 0.1.0
 * @since 0.6.0
 * @author AMBROISE PARK Consulting
 */

import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { isClient, safeSessionStorage } from '@donotdev/core';
import { useNavigate } from '@donotdev/ui/routing/hooks';

import { useAuthSafe } from '../utils/useAuthSafe';

/**
 * Props for SignedInRedirect
 */
export interface SignedInRedirectProps {
  /** App path signed-in visitors are sent to (PageMeta `signedInRedirect`) */
  to: string;
  /** The page, rendered for everyone until the redirect happens */
  children: ReactNode;
}

/**
 * SignedInRedirect - sends signed-in visitors of a page to `to` (replace).
 *
 * Renders the page for everyone (server render, signed-out visitors). Once the auth
 * user is known, navigates to `to` unless a return-to is pending (`?returnTo=` or
 * the saved `dndev.auth.returnTo`): AuthReturnTo takes the visitor there instead.
 * Generated route wrappers (Next) and createAppRouter (Vite) mount it for pages whose
 * PageMeta sets `signedInRedirect`.
 *
 * @component
 * @example
 * ```tsx
 * <SignedInRedirect to="/catalogue"><HomePage /></SignedInRedirect>
 * ```
 */
export function SignedInRedirect({ to, children }: SignedInRedirectProps) {
  const user = useAuthSafe('user');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !isClient()) return;
    if (new URLSearchParams(window.location.search).has('returnTo')) return;
    if (safeSessionStorage.getItem('dndev.auth.returnTo')) return;
    navigate(to, { replace: true });
  }, [user, to, navigate]);

  return <>{children}</>;
}
