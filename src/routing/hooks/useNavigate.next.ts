'use client';
// packages/ui/src/routing/hooks/useNavigate.next.ts

/**
 * @fileoverview Next.js-specific navigation hooks
 * @description Navigation hooks for Next.js App Router
 *
 * @version 0.3.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useTransition } from 'react';

import { useRouter as useNextRouter } from 'next/navigation';

import { isClient, useNavigationStore, useOverlayStore } from '@donotdev/core';

import type { Navigate, NavigateFunction, NavigateOptions } from './types';
import { useRoutePath } from './useRoutePath.next';
import { useLocalizedPath } from './useUrlLanguage.next';

/**
 * Navigation hook. Auth is handled by AuthGuard (cold-load redirect).
 * Protected routes are hidden from unauthorized users via useAccessibleRoutes.
 * App paths stay in the current URL's language (`/produits` → `/en/produits` on an
 * English page); a path with an explicit language prefix keeps it.
 *
 * Returns the navigate function itself, so `const navigate = useNavigate()` works as
 * before. It also carries `navigate` and `pending`, for `const { navigate, pending } =
 * useNavigate()`: the router call runs in a React transition and `pending` stays true
 * until the App Router has rendered the new route. Use it for `loading` on the button
 * that navigates. Overlays still close at the click (`closeAll`).
 *
 * @version 0.4.0
 * @since 0.0.1
 */
export function useNavigate(): Navigate {
  const router = useNextRouter();
  const closeAll = useOverlayStore((state) => state.closeAll);
  const localize = useLocalizedPath();
  const routePath = useRoutePath();
  const startNavigation = useNavigationStore((state) => state.startNavigation);
  const [pending, startTransition] = useTransition();

  const navigate: NavigateFunction = (path, options) => {
    closeAll();

    if (path === 'back') {
      startTransition(() => router.back());
      return;
    }

    const to = localize(path);
    startNavigation(path, routePath);
    startTransition(() => {
      if (options?.replace) router.replace(to);
      else router.push(to);
    });

    if (options?.preserveScroll && isClient()) {
      const scrollY = window.scrollY;
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'auto' });
      });
    }
  };

  return Object.assign(navigate, { navigate, pending });
}

export function useBack() {
  const router = useNextRouter();
  return () => router.back();
}

export function useRefresh() {
  const router = useNextRouter();
  return () => router.refresh();
}

export function usePrefetch() {
  const router = useNextRouter();
  const localize = useLocalizedPath();
  return (to: string) => router.prefetch(localize(to));
}
