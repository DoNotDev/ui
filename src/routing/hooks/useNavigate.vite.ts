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

import { useTransition } from 'react';

import { useNavigate as useRouterNavigate } from 'react-router-dom';

import {
  getLanguageRouting,
  isClient,
  splitLanguagePath,
  useNavigationStore,
  useOverlayStore,
} from '@donotdev/core';

import type { Navigate, NavigateFunction, NavigateOptions } from './types';
import { useRoutePath } from './useRoutePath.vite';
import { useUrlLanguage } from './useUrlLanguage.vite';

/**
 * Navigation hook. Auth is handled by AuthGuard (cold-load redirect).
 * Protected routes are hidden from unauthorized users via useAccessibleRoutes.
 * The router basename carries the language prefix (createAppRouter), so app paths
 * stay in the current language. A path prefixed with another language opens that
 * language's URL (document navigation: the router restarts under its prefix).
 *
 * Returns the navigate function itself, so `const navigate = useNavigate()` works as
 * before. It also carries `navigate` and `pending`, for `const { navigate, pending } =
 * useNavigate()`: the router call runs in a React transition and `pending` stays true
 * while the new route suspends (lazy route chunk). Use it for `loading` on the button
 * that navigates. Overlays still close at the click (`closeAll`).
 *
 * @version 0.4.0
 * @since 0.0.1
 */
export function useNavigate(): Navigate {
  const routerNavigate = useRouterNavigate();
  const closeAll = useOverlayStore((state) => state.closeAll);
  const language = useUrlLanguage();
  const routePath = useRoutePath();
  const startNavigation = useNavigationStore((state) => state.startNavigation);
  const [pending, startTransition] = useTransition();

  const navigate: NavigateFunction = (path, options) => {
    closeAll();

    if (path === 'back') {
      startTransition(() => {
        void routerNavigate(-1);
      });
      return;
    }

    const split = path.startsWith('/')
      ? splitLanguagePath(path, getLanguageRouting())
      : null;
    if (split?.prefixed && split.language !== language) {
      window.location.assign(path);
      return;
    }
    const to = split?.prefixed ? split.path : path;
    startNavigation(to, routePath);

    startTransition(() => {
      void routerNavigate(to, options?.replace ? { replace: true } : undefined);
    });
  };

  return Object.assign(navigate, { navigate, pending });
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
