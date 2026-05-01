// packages/ui/src/routing/index.ts

/**
 * @fileoverview Routing package
 * @description Platform-agnostic routing components and hooks (work in both Vite + Next.js)
 * Vite-specific routing (AppRoutes, RootLayout) moved to ../vite-routing
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

// Components - all platform-agnostic
export * from './Link';
// NavigationItemComponent intentionally NOT exported — internal building block.
// Public API: HeaderNavigation (path prop for single item), DnDevNavigationMenu (full menu).
export * from './AuthGuard';
export * from './AuthGuardFallback';
export { AuthReturnTo } from './AuthReturnTo';
export * from './GoTo';
export { default as GoToWrapper } from './GoToWrapper';
export { default as GoToInput } from './GoToInput';
// GoToDialog intentionally NOT exported - lazy loaded by GoToWrapper
export * from './DnDevNavigationMenu';
export { default as NotFoundPage } from './404';

// Hooks - platform-specific via conditional exports
// '@donotdev/ui/routing/hooks' resolves to:
// - hooks.vite.ts when bundled with Vite (vite-app condition)
// - hooks.next.ts when bundled with Next.js (default condition)
// NOTE: Explicit named exports required - esbuild can't re-export with 'export *' from external
export {
  useNavigate,
  useBack,
  useRefresh,
  usePrefetch,
  useLocation,
  useParams,
  useRouteParam,
  useSearchParams,
  useMatch,
  useQueryParams,
  useRedirectGuard,
} from '@donotdev/ui/routing/hooks';
export type {
  NavigateOptions,
  RedirectGuardOptions,
  RedirectGuardResult,
} from '@donotdev/ui/routing/hooks';
export * from './useNavigation';
export * from './useGoTo';
