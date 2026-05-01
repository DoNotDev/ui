// packages/ui/src/internal/layout/zones/DnDevHeader.tsx

/**
 * @fileoverview DnDevHeader Zone Component
 * @description Header zone with smart defaults.
 *
 * Layout: start (start-aligned) | center (absolutely centered) | end (end-aligned)
 * - start: [AppIcon, AppTitle] - start-aligned
 * - center: null - absolutely centered overlay (regardless of start/end content)
 * - end: [GoTo, Auth, Language, Theme] - end-aligned
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { memo } from 'react';

import { cn } from '@donotdev/components';

import type { ReactNode } from 'react';

export interface DnDevHeaderProps {
  /** Custom mode: full zone replacement. When provided, slot props are ignored and no polish CSS applies. */
  children?: ReactNode;
  /** Start slot - ReactNode from preset or consumer override */
  start?: ReactNode | null;
  /** Center slot - ReactNode from preset or consumer override */
  center?: ReactNode | null;
  /** End slot - ReactNode from preset or consumer override */
  end?: ReactNode | null;
}

/**
 * DnDevHeader - Header zone with smart defaults
 *
 * Layout: start (start-aligned) | center (absolutely centered) | end (end-aligned)
 * Center is absolutely positioned overlay, independent of start/end content.
 *
 * @critical The `<header>` MUST have `role="banner"` and className `"header"`.
 * ALL header CSS in layout-variables.css targets `header[role='banner']`.
 * The inner divs MUST use classNames `"header-start"`, `"header-center"`, `"header-end"`.
 * Removing or renaming any of these silently breaks header layout, spacing, visibility,
 * and preset-specific rules (e.g. landing compact mode, mergedBar hiding).
 * DO NOT change role, tag, or classNames.
 */
function DnDevHeaderComponent({
  children,
  start,
  center,
  end,
}: DnDevHeaderProps): ReactNode {
  // Custom mode: children provided = consumer owns zone visuals
  const isCustom = children !== undefined;

  if (isCustom) {
    return (
      <header role="banner" className="header" data-custom>
        {children}
      </header>
    );
  }

  // Slotted mode: framework slot layout with polish CSS
  const hasCenter = center !== null && center !== undefined;

  return (
    <header role="banner" className="header">
      <div className="header-start">{start}</div>
      {hasCenter && <div className="header-center">{center}</div>}
      <div className="header-end">{end}</div>
    </header>
  );
}

export const DnDevHeader = memo(DnDevHeaderComponent);
