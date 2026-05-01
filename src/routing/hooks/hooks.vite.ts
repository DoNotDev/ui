'use client';
// packages/ui/src/routing/hooks/hooks.vite.ts

/**
 * @fileoverview Vite-specific routing hooks barrel
 * @description Exports Vite/React Router implementations of routing hooks.
 * This file is resolved via package.json conditional exports when bundled with Vite.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

export {
  useNavigate,
  useBack,
  useRefresh,
  usePrefetch,
} from './useNavigate.vite';
export { useLocation } from './useLocation.vite';
export { useParams } from './useParams.vite';
export { useRouteParam } from './useRouteParam.vite';
export { useSearchParams } from './useSearchParams.vite';
export { useMatch } from './useMatch.vite';
export { useQueryParams } from './useQueryParams.vite';
export { useRedirectGuard } from './useRedirectGuard.vite';
export type { NavigateOptions } from './types';
export type {
  RedirectGuardOptions,
  RedirectGuardResult,
} from './useRedirectGuard.vite';
