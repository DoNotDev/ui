// packages/ui/src/components/layout/PageConfig.tsx

/**
 * @fileoverview PageConfig - Declarative per-page layout overrides (Next.js)
 * @description Tiny component that sets route-level overrides in the theme store.
 * For Vite, LayoutRoute handles this automatically from PageMeta.
 * For Next.js, drop <PageConfig hideBreadcrumbs /> in your page component.
 *
 * @version 0.1.0
 * @since 0.2.0
 * @author AMBROISE PARK Consulting
 */

import { useLayoutEffect } from 'react';

import type { LayoutPreset } from '@donotdev/core';
import { useLayout } from '@donotdev/core';

/**
 * PageConfig - Declarative per-page layout overrides
 *
 * Sets route-level overrides (preset, hideBreadcrumbs) in the theme store.
 * Cleans up on unmount (resets to defaults).
 *
 * @example
 * ```tsx
 * // In a Next.js page component:
 * export default function MyPage() {
 *   return (
 *     <>
 *       <PageConfig hideBreadcrumbs />
 *       <PageContainer>...</PageContainer>
 *     </>
 *   );
 * }
 * ```
 */
export function PageConfig({
  hideBreadcrumbs,
  preset,
}: {
  hideBreadcrumbs?: boolean;
  preset?: LayoutPreset;
}) {
  const setHide = useLayout('setRouteHideBreadcrumbs');
  const setPreset = useLayout('setRoutePresetOverride');

  useLayoutEffect(() => {
    if (hideBreadcrumbs != null) setHide(hideBreadcrumbs);
    if (preset != null) setPreset(preset);
    return () => {
      setHide(false);
      setPreset(null);
    };
  }, [hideBreadcrumbs, preset, setHide, setPreset]);

  return null;
}
