// packages/ui/src/internal/layout/zones/DnDevMergedBar.tsx

/**
 * @fileoverview DnDevMergedBar Zone Component
 * @description Mobile navigation bar with Sheet trigger.
 *
 * Position: fixed (top or bottom)
 * Slots: trigger (visible bar) + top/content/bottom (Sheet content)
 * CSS: display:none on desktop, display:flex on mobile
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { ChevronUp, Menu } from 'lucide-react';
import { memo, useState, useEffect } from 'react';

import {
  Stack,
  Button,
  Sheet,
  BUTTON_VARIANT,
  Separator,
  SEPARATOR_VARIANT,
} from '@donotdev/components';
import { useTranslation } from '@donotdev/core';
import { useLocation } from '@donotdev/ui/routing/hooks';

import type { ReactNode } from 'react';

export interface DnDevMergedBarProps {
  /** Bar position */
  position: 'top' | 'bottom';
  /** Bar height (default: CSS uses var(--header-height) for top, 48px for bottom) */
  height?: string;
  /** Trigger slot - ReactNode from preset or consumer override */
  trigger?: ReactNode | null;
  /** Top slot - ReactNode from preset or consumer override */
  top?: ReactNode | null;
  /** Content slot - ReactNode from preset or consumer override */
  content?: ReactNode | null;
  /** Bottom slot - ReactNode from preset or consumer override */
  bottom?: ReactNode | null;
}

/**
 * DnDevMergedBar - Mobile navigation zone
 *
 * Renders position:fixed bar that CSS toggles.
 * Slots are customizable per-preset with smart defaults:
 * - trigger: What shows in the fixed bar (default: header.start or AppBranding)
 * - top/content/bottom: Sheet content (default: derived from sidebar)
 *
 * @critical The outer `<div>` MUST have className `"merged-bar"` and `data-position`.
 * ALL mergedBar CSS in layout-variables.css targets `.merged-bar` and `.merged-bar[data-position]`.
 * This controls: position:fixed placement, display:none/flex toggling per preset + breakpoint,
 * safe area padding, border, and z-index. Inner divs MUST keep `"merged-bar-trigger"`,
 * `"merged-bar-sheet-content"`, `"merged-bar-sheet-scroll"` classNames.
 * DO NOT change classNames or data attributes.
 */
function DnDevMergedBarComponent({
  position,
  height,
  trigger,
  top,
  content,
  bottom,
}: DnDevMergedBarProps): ReactNode {
  const { t } = useTranslation('dndev');
  const Icon = position === 'top' ? Menu : ChevronUp;
  // Sheet component accepts 'left'|'right'|'top'|'bottom' (physical), not logical properties.
  // For RTL apps, this would need Sheet to support 'start'/'end' sides — tracked separately.
  const sheetSide = position === 'top' ? 'left' : position;
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close sheet when route changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Build sheet content
  const sheetNode = (
    <Stack direction="column" className="merged-bar-sheet-content">
      {top && (
        <>
          {top}
          <Separator variant={SEPARATOR_VARIANT.MUTED} />
        </>
      )}

      {content && <div className="merged-bar-sheet-scroll">{content}</div>}

      {bottom && (
        <>
          <Separator variant={SEPARATOR_VARIANT.MUTED} />
          {bottom}
        </>
      )}
    </Stack>
  );

  const triggerButton = (
    <Button
      variant={BUTTON_VARIANT.GHOST}
      icon={Icon}
      aria-label="Open navigation"
    />
  );

  return (
    <div className="merged-bar" data-position={position}>
      <Stack
        direction="row"
        align="center"
        justify="between"
        className="merged-bar-trigger"
      >
        {trigger}
        <Sheet
          trigger={triggerButton}
          side={sheetSide}
          open={open}
          onOpenChange={setOpen}
          title={t('sheet.navigation', { defaultValue: 'Navigation' })}
        >
          {sheetNode}
        </Sheet>
      </Stack>
    </div>
  );
}

export const DnDevMergedBar = memo(DnDevMergedBarComponent);
