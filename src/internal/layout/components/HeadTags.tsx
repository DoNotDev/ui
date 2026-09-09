'use client';
// packages/ui/src/internal/layout/components/HeadTags.tsx

/**
 * @fileoverview Platform-aware <head> tag wrapper
 * @description Renders document-head tags (<title>/<meta>/<link>) the right way
 * per platform, so the same component code works under Next SSR and Vite CSR.
 *
 * - Next.js: renders a plain fragment. React 19 natively hoists <title>, <meta>
 *   and <link> to <head> from anywhere in the tree, so no head-management library
 *   is needed. Crucially, rendering react-helmet-async on the server throws
 *   (it reads `document`), which is what blocked SSR — this path avoids it.
 * - Vite (CSR SPA): renders react-helmet-async's <Helmet>, which hoists tags to
 *   <head> at runtime. Behavior is unchanged from before.
 *
 * @version 0.1.0
 * @since 0.1.0
 * @author AMBROISE PARK Consulting
 */

import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';

import { isNextJs } from '@donotdev/core';

export function HeadTags({ children }: { children: ReactNode }) {
  // On any server render, never touch react-helmet-async — it reads `document`
  // and throws. React 19 hoists <title>/<meta>/<link> to <head> natively during
  // SSR, so a fragment is all that's needed. (Vite is a CSR SPA and never renders
  // on a server, so this branch is Next-SSR only.)
  if (typeof document === 'undefined') {
    return <>{children}</>;
  }
  // Client render: on Next, React 19 already hoisted these tags server-side and
  // there is no <HelmetProvider> — so keep using the native fragment. Only the
  // Vite SPA (no Next markers) uses react-helmet-async, exactly as before.
  if (isNextJs()) {
    return <>{children}</>;
  }
  return <Helmet>{children}</Helmet>;
}
