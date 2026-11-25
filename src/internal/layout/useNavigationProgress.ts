// packages/ui/src/internal/layout/useNavigationProgress.ts

/**
 * @fileoverview Navigation progress bar lifecycle
 * @description Keeps DnDevLayout's navigation progress bar mounted past the end of the
 * navigation, so it completes and fades out instead of vanishing mid-way.
 *
 * @version 0.1.0
 * @since 0.3.8
 * @author AMBROISE PARK Consulting
 */

import { useCallback, useState, type TransitionEvent } from 'react';

/** The bar currently mounted. */
export interface NavigationProgressRun {
  /** React key: a new navigation during the finish mounts a fresh bar (its trickle restarts). */
  run: number;
  /** The navigation ended: the bar completes and fades out (`data-finishing`). */
  finishing: boolean;
}

/**
 * Navigation progress bar lifecycle: start (navigating) → finishing (navigation ended,
 * the bar completes and fades) → removed (its opacity transition on the bar root ended or
 * was cancelled). The CSS (ui `layout-variables.css`, `.dndev-navigation-progress`) plays
 * every stage on the compositor; this hook only says which stage the bar is in.
 * A navigation that ends before the bar shows cancels its fade-in transition, which
 * removes it at once.
 *
 * @param navigating - The navigation store's `navigating`
 * @returns `progress` (null = no bar) and `onFaded`, the bar root's `onTransitionEnd` and
 * `onTransitionCancel` handler
 */
export function useNavigationProgress(navigating: boolean): {
  progress: NavigationProgressRun | null;
  onFaded: (event: TransitionEvent<HTMLElement>) => void;
} {
  const [progress, setProgress] = useState<NavigationProgressRun | null>(
    navigating ? { run: 0, finishing: false } : null
  );
  // Previous `navigating`, adjusted during render: the bar must not unmount for one
  // commit between the end of the navigation and the finishing stage (a remount
  // would restart its transitions).
  const [lastNavigating, setLastNavigating] = useState(navigating);
  if (navigating !== lastNavigating) {
    setLastNavigating(navigating);
    setProgress(
      navigating
        ? { run: (progress?.run ?? 0) + 1, finishing: false }
        : progress && { ...progress, finishing: true }
    );
  }

  const onFaded = useCallback((event: TransitionEvent<HTMLElement>) => {
    // The root's own opacity only (the indicator's events bubble; transform ends first)
    if (event.target !== event.currentTarget || event.propertyName !== 'opacity')
      return;
    setProgress((current) => (current?.finishing ? null : current));
  }, []);

  return { progress, onFaded };
}
