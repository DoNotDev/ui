// packages/ui/src/components/layout/GameFlow.tsx

/**
 * @fileoverview Game Flow - Screen router for game/session flows
 * @description Handles routing, lazy loading, and preloading of game screens
 * @package @donotdev/ui
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import {
  useEffect,
  Suspense,
  lazy,
  type ComponentType,
  type ReactNode,
} from 'react';

/**
 * Screen registry type - maps screen names to lazy import functions
 */
export type ScreenRegistry = Record<
  string,
  () => Promise<{ default: ComponentType<any> }>
>;

/**
 * GameFlow props
 */
export interface GameFlowProps {
  /** Registry mapping screen names to lazy import functions */
  screenRegistry: ScreenRegistry;
  /** Current screen name to render */
  currentScreen: string | null;
  /** Next screen name for preloading (optional) */
  nextScreen?: string | null;
  /** Fallback component for Suspense (optional) */
  fallback?: ReactNode;
}

/**
 * Module-level cache for preloaded screens
 * Tracks which screens have been preloaded to avoid duplicate preloading
 */
const preloadedScreens = new Set<string>();

/**
 * Module-level cache for lazy components.
 * CRITICAL: lazy() must NOT be called inside a component (useMemo or otherwise).
 * Doing so creates a new component TYPE on each call, which causes React to
 * unmount/remount the entire subtree and can trigger Rules of Hooks violations.
 * This cache ensures each screen name always resolves to the same lazy component ref.
 */
const lazyComponentCache = new Map<string, ComponentType<any>>();

/**
 * Get or create a cached lazy component for a screen name
 */
function getLazyComponent(
  screenName: string,
  registry: ScreenRegistry
): ComponentType<any> | null {
  const cached = lazyComponentCache.get(screenName);
  if (cached) return cached;

  const importer = registry[screenName];
  if (!importer) return null;

  const component = lazy(importer);
  lazyComponentCache.set(screenName, component);
  return component;
}

/**
 * GameFlow - Screen router for game/session flows
 *
 * Handles:
 * - Routing to correct screen component based on currentScreen
 * - Lazy loading of screen components
 * - Preloading of nextScreen for instant transitions
 * - h-full wrapper for proper layout filling
 * - Suspense boundaries for loading states
 *
 * @param {GameFlowProps} props - Component props
 * @param {ScreenRegistry} props.screenRegistry - Registry of screen lazy imports
 * @param {string | null} props.currentScreen - Current screen name to render
 * @param {string | null} [props.nextScreen] - Next screen name for preloading
 * @param {ReactNode} [props.fallback] - Fallback component for Suspense
 * @returns {JSX.Element | null} GameFlow component
 *
 * @example
 * ```tsx
 * <GameFlow
 * screenRegistry={screenRegistry}
 * currentScreen={currentScreen}
 * nextScreen={nextScreen}
 * fallback={<Spinner overlay />}
 * />
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function GameFlow({
  screenRegistry,
  currentScreen,
  nextScreen,
  fallback = null,
}: GameFlowProps) {
  // Preload nextScreen component when it changes
  useEffect(() => {
    if (nextScreen && !preloadedScreens.has(nextScreen)) {
      preloadedScreens.add(nextScreen);
      const importer = screenRegistry[nextScreen];
      if (importer) {
        // Trigger lazy load without awaiting (fire and forget)
        importer().catch(() => {
          // Silently handle import errors - component will handle on render
        });
      }
    }
  }, [nextScreen, screenRegistry]);

  // Get cached lazy component for currentScreen (stable reference per screen name)
  const ScreenComponent = currentScreen
    ? getLazyComponent(currentScreen, screenRegistry)
    : null;

  // If no currentScreen or no component found, return null
  if (!currentScreen || !ScreenComponent) {
    return null;
  }

  return (
    <div style={{ height: '100%' }}>
      <Suspense fallback={fallback}>
        <ScreenComponent />
      </Suspense>
    </div>
  );
}
