// packages/ui/src/routing/hooks/types.ts

/**
 * @fileoverview Routing hook types
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

/**
 * Navigation options for useNavigate hook
 */
export interface NavigateOptions {
  /** Replace current history entry instead of pushing new one */
  replace?: boolean;
  /** Preserve scroll position (default: false, scrolls to top) */
  preserveScroll?: boolean;
  /**
   * With `'back'`: the app path to open when the previous history entry is not a page of
   * this app (the visitor landed here directly). Default `'/'` (`BACK_FALLBACK`).
   */
  fallback?: string;
}

/** Default target of a back navigation after a direct landing. */
export const BACK_FALLBACK = '/';

/**
 * Navigates to an app path, or `'back'`: the previous page when it is a page of this app
 * (navigation store `inAppHistory`), otherwise `options.fallback` (default `'/'`).
 */
export type NavigateFunction = (path: string, options?: NavigateOptions) => void;

/**
 * What `useNavigate()` returns: the navigate function, also carrying itself as
 * `navigate` and the transition's `pending` (true until the new route has rendered).
 */
export type Navigate = NavigateFunction & {
  navigate: NavigateFunction;
  pending: boolean;
};
