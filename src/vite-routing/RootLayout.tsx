// packages/ui/src/vite-routing/RootLayout.tsx

/**
 * @fileoverview RootLayout - Root route layout component
 * @description Wraps all routes with QueryProviders, UIProviders, and Layout
 *
 * This component is rendered as the root route element in the React Router v7
 * data router configuration. It provides the core provider hierarchy for all
 * routes in the application.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Suspense, lazy, useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { globalEmitter, isClient, QueryProviders } from '@donotdev/core';
import type { LayoutConfig } from '@donotdev/core';

import { DnDevLayout } from '../internal/layout/DnDevLayout';
import { UIProviders } from '../internal/providers/UIProviders';
import { AuthReturnTo } from '../routing/AuthReturnTo';
import { PasswordResetCallback } from '../utils/useAuthSafe';

// Only lazy load non-critical components (not in render path)
const AutoMetaTags = lazy(() =>
  import('../internal/layout/components/AutoMetaTags').then((m) => ({
    default: m.default,
  }))
);
const ConsentBanner = lazy(() =>
  import('../components/cookie-consent/ConsentBanner').then((m) => ({
    default: m.default,
  }))
);
const PWAUpdateNotification = lazy(() =>
  import('../internal/layout/components/PWAUpdateNotification').then((m) => ({
    default: m.default,
  }))
);
const RedirectOverlay = lazy(() =>
  import('../components/common/RedirectOverlay').then((m) => ({
    default: m.RedirectOverlay,
  }))
);

/**
 * CustomScrollRestoration - Scroll restoration for custom scroll containers
 *
 * React Router's <ScrollRestoration /> only works with window-level scrolling.
 * Our layout uses main[role='main'] as the scroll container (overflow-y: auto),
 * so we need custom scroll restoration logic.
 *
 * Behavior:
 * - New navigation (PUSH): Scroll main element to top
 * - Back/Forward (POP): Restore previous scroll position
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
function CustomScrollRestoration() {
  const location = useLocation();
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const prevLocationKey = useRef<string | null>(null);

  useEffect(() => {
    const mainElement = document.querySelector('main[role="main"]');
    if (!mainElement) return;

    // main is always the sole scroll container (overflow-y: auto)

    // Save scroll position of the page we're leaving
    if (prevLocationKey.current) {
      scrollPositions.current.set(
        prevLocationKey.current,
        mainElement.scrollTop
      );
    }

    // Check if this is a back/forward navigation (POP) by checking saved position
    const saved = scrollPositions.current.get(location.key);

    if (saved !== undefined) {
      // POP navigation - restore scroll position
      requestAnimationFrame(() => {
        mainElement.scrollTop = saved;
      });
    } else {
      // PUSH navigation - scroll to top
      mainElement.scrollTop = 0;
    }

    prevLocationKey.current = location.key;

    // Cleanup: Keep only last 20 positions to prevent memory leaks
    if (scrollPositions.current.size > 20) {
      for (const key of scrollPositions.current.keys()) {
        scrollPositions.current.delete(key);
        break;
      }
    }
  }, [location.pathname, location.key]);

  return null;
}

/**
 * FrameworkReadySignal - Signals when framework providers are painted
 *
 * Framework responsibility: Show shell loader while framework sets up (stores, providers).
 * Customer responsibility: Handle their own loading states via Suspense boundaries.
 *
 * This component signals when the FRAMEWORK is ready (providers painted),
 * NOT when customer content is ready. Customer's Suspense fallbacks handle that gap.
 *
 * Uses useLayoutEffect to detect when framework providers (UIProviders wrapper) are painted.
 * Dispatches 'DNDEV_FRAMEWORK_READY' event for shell loader removal coordination.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
function FrameworkReadySignal({ children }: { children: React.ReactNode }) {
  const hasSignaled = useRef(false);
  const frameworkRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isClient() || hasSignaled.current) return;

    const checkAndSignal = () => {
      if (hasSignaled.current) return;

      const element = frameworkRef.current;
      if (!element) return;

      requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const hasVisibleFramework = rect.width > 0 && rect.height > 0;

        if (hasVisibleFramework) {
          hasSignaled.current = true;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              globalEmitter.emit('DNDEV_FRAMEWORK_READY');
            });
          });
        }
      });
    };

    checkAndSignal();

    const timeout = setTimeout(() => {
      if (!hasSignaled.current) {
        hasSignaled.current = true;
        globalEmitter.emit('DNDEV_FRAMEWORK_READY');
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return <div ref={frameworkRef}>{children}</div>;
}

/**
 * RouteReadySignal - Signals when route content is painted
 *
 * Emits 'DNDEV_ROUTE_READY' event when route content (inside Suspense) is painted.
 * Used in coordination with FrameworkReadySignal to time shell loader removal.
 *
 * Shell loader removed only when BOTH framework AND route are ready,
 * preventing "late arrival" of route content after Header/Footer paint.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
function RouteReadySignal({ children }: { children: React.ReactNode }) {
  const hasSignaled = useRef(false);

  useLayoutEffect(() => {
    if (!isClient() || hasSignaled.current) return;

    // Wait for two animation frames to ensure paint completion
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (hasSignaled.current) return;
        hasSignaled.current = true;
        globalEmitter.emit('DNDEV_ROUTE_READY');
      });
    });
  }, []);

  return <>{children}</>;
}

/**
 * RootLayout props
 */
interface RootDnDevLayoutProps {
  /** Layout configuration */
  layout?: LayoutConfig;
}

/**
 * RootLayout - Root route layout component
 *
 * Provides the core provider hierarchy for all routes:
 * - QueryProviders (React Query)
 * - UIProviders (design system, error boundaries)
 * - AutoMetaTags (SEO)
 * - FrameworkReadySignal (framework initialization signal)
 * - Layout (application layout with slots)
 * - ConsentBanner (cookie consent)
 * - PWAUpdateNotification (PWA update notifications)
 *
 * Wraps <Outlet /> which renders child routes.
 *
 * @param props - RootLayout props
 * @returns Root layout with providers
 *
 * @example
 * ```tsx
 * // Used in route configuration
 * const routes = [
 * {
 * path: '/',
 * element: <RootLayout layout={layoutConfig} />,
 * children: [...]
 * }
 * ];
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function RootLayout({ layout }: RootDnDevLayoutProps) {
  return (
    <QueryProviders>
      <UIProviders>
        {/* SEO - lazy, non-blocking */}
        <Suspense fallback={null}>
          <AutoMetaTags />
        </Suspense>

        {/* Framework ready signal - dispatches when framework providers are painted */}
        <FrameworkReadySignal>
          {/* Layout with route content - CRITICAL PATH, no lazy */}
          <DnDevLayout layout={layout}>
            <RouteReadySignal>
              <Outlet />
            </RouteReadySignal>
          </DnDevLayout>

          {/* Custom scroll restoration */}
          <CustomScrollRestoration />

          {/* Non-critical lazy components - isolated Suspense */}
          <AuthReturnTo />
          <Suspense fallback={null}>
            <ConsentBanner />
            <PasswordResetCallback />
            <PWAUpdateNotification />
            <RedirectOverlay />
          </Suspense>
        </FrameworkReadySignal>
      </UIProviders>
    </QueryProviders>
  );
}
