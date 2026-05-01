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
}
