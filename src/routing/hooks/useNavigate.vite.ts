'use client';
// packages/ui/src/routing/hooks/useNavigate.vite.ts

/**
 * @fileoverview Vite-specific navigation hooks
 * @description Navigation hooks for React Router (Vite)
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useNavigate as useRouterNavigate } from 'react-router-dom';

import { isClient, useOverlayStore } from '@donotdev/core';

import type { NavigateOptions } from './types';

/**
 * Navigation hook. Auth is handled by AuthGuard (cold-load redirect).
 * Protected routes are hidden from unauthorized users via useAccessibleRoutes.
 */
export function useNavigate() {
  const routerNavigate = useRouterNavigate();
  const closeAll = useOverlayStore((state) => state.closeAll);

  return (to: string, options?: NavigateOptions) => {
    if (to === 'back') {
      closeAll();
      return routerNavigate(-1);
    }

    closeAll();

    if (options?.replace) return routerNavigate(to, { replace: true });
    return routerNavigate(to);
  };
}

export function useBack() {
  const navigate = useRouterNavigate();
  return () => navigate(-1);
}

export function useRefresh() {
  return () => {
    if (isClient()) window.location.reload();
  };
}

export function usePrefetch() {
  return (_to: string) => {
    // Vite: no-op
  };
}
