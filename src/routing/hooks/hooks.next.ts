'use client';
// packages/ui/src/routing/hooks/hooks.next.ts

/**
 * @fileoverview Next.js-specific routing hooks barrel
 * @description Exports Next.js App Router implementations of routing hooks.
 * This file is resolved via package.json conditional exports when bundled with Next.js.
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
} from './useNavigate.next';
export { useLocation } from './useLocation.next';
export { useParams } from './useParams.next';
export { useRouteParam } from './useRouteParam.next';
export { useSearchParams } from './useSearchParams.next';
export { useMatch } from './useMatch.next';
export { useQueryParams } from './useQueryParams.next';
export { useRedirectGuard } from './useRedirectGuard.next';
export type { NavigateOptions } from './types';
export type {
  RedirectGuardOptions,
  RedirectGuardResult,
} from './useRedirectGuard.next';
