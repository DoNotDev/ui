'use client';
// packages/ui/src/routing/hooks/useNavigate.next.ts

/**
 * @fileoverview Next.js-specific navigation hooks
 * @description Navigation hooks for Next.js App Router
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useRouter as useNextRouter } from 'next/navigation';

import { isClient, useOverlayStore } from '@donotdev/core';

import type { NavigateOptions } from './types';

/**
 * Navigation hook. Auth is handled by AuthGuard (cold-load redirect).
 * Protected routes are hidden from unauthorized users via useAccessibleRoutes.
 */
export function useNavigate() {
  const router = useNextRouter();
  const closeAll = useOverlayStore((state) => state.closeAll);

  return (to: string, options?: NavigateOptions) => {
    if (to === 'back') {
      closeAll();
      return router.back();
    }

    closeAll();

    if (options?.preserveScroll && isClient()) {
      const scrollY = window.scrollY;
      if (options?.replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'auto' });
      });
      return;
    }

    if (options?.replace) return router.replace(to);
    return router.push(to);
  };
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
  return (to: string) => router.prefetch(to);
}
