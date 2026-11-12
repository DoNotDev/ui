'use client';
// packages/ui/src/routing/hooks/useNavigate.vite.ts

/**
 * @fileoverview Vite-specific navigation hooks
 * @description Navigation hooks for React Router (Vite)
 *
 * @version 0.3.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useNavigate as useRouterNavigate } from 'react-router-dom';

import {
  getLanguageRouting,
  isClient,
  splitLanguagePath,
  useOverlayStore,
} from '@donotdev/core';

import type { NavigateOptions } from './types';
import { useUrlLanguage } from './useUrlLanguage.vite';

/**
 * Navigation hook. Auth is handled by AuthGuard (cold-load redirect).
 * Protected routes are hidden from unauthorized users via useAccessibleRoutes.
 * The router basename carries the language prefix (createAppRouter), so app paths
 * stay in the current language. A path prefixed with another language opens that
 * language's URL (document navigation: the router restarts under its prefix).
 *
 * @version 0.3.0
 * @since 0.0.1
 */
export function useNavigate() {
  const routerNavigate = useRouterNavigate();
  const closeAll = useOverlayStore((state) => state.closeAll);
  const language = useUrlLanguage();

  return (path: string, options?: NavigateOptions) => {
    if (path === 'back') {
      closeAll();
      return routerNavigate(-1);
    }

    closeAll();

    const split = path.startsWith('/')
      ? splitLanguagePath(path, getLanguageRouting())
      : null;
    if (split?.prefixed && split.language !== language) {
      window.location.assign(path);
      return;
    }
    const to = split?.prefixed ? split.path : path;

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
