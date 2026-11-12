'use client';
// packages/ui/src/routing/hooks/useRoutePath.vite.ts

/**
 * @fileoverview Vite route path of the current URL
 * @description The router pathname (React Router strips the language basename).
 *
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */

import { useLocation as useRouterLocation } from 'react-router-dom';

/**
 * Route path of the current URL: the pathname without its language prefix
 * (`/en/produits` → `/produits`). Same as `useLocation().pathname`; on Next it is the
 * one that stays safe in cached (static) renders.
 *
 * @returns Route path, always starting with `/`
 *
 * @version 0.1.0
 * @since 0.2.3
 * @author AMBROISE PARK Consulting
 */
export function useRoutePath(): string {
  return useRouterLocation().pathname;
}
