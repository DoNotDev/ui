// packages/ui/src/internal/layout/zones/DnDevSidebar.tsx

/**
 * @fileoverview DnDevSidebar Zone Component
 * @description Flat sidebar zone with resize mechanics built-in.
 *
 * Structure: aside > nav + resize-handle
 * No nesting. Resize logic on aside directly.
 *
 * Slots: top | content | bottom
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { memo, useRef, useEffect, useState } from 'react';

import { useLayout } from '@donotdev/core';

import { DEFAULT_SLOTS } from '../config/defaults';

import type { ReactNode } from 'react';

/** Resize handle width - matches CSS variable --sidebar-resize-handle-width */
const RESIZE_HANDLE_WIDTH = 6;

export interface DnDevSidebarProps {
  /** Custom mode: full zone replacement. When provided, slot props are ignored and no polish CSS applies. */
  children?: ReactNode;
  /** Top slot - ReactNode from preset or consumer override */
  top?: ReactNode | null;
  /** Content slot - ReactNode from preset or consumer override */
  content?: ReactNode | null;
  /** Bottom slot - ReactNode from preset or consumer override */
  bottom?: ReactNode | null;
  /** Default width in pixels (default: 240) */
  defaultWidth?: number;
  /** Minimum width when resizing (default: 48) */
  minWidth?: number;
  /** Maximum width when resizing (default: 400) */
  maxWidth?: number;
}

/**
 * DnDevSidebar - Flat sidebar zone with built-in resize
 *
 * Structure: aside.sidebar > nav.sidebar-nav + div.resize-handle
 * Resize logic lives on aside directly. No wrapper components.
 *
 * @critical The `<aside>` MUST have `role="navigation"` — ALL CSS in layout-variables.css
 * targets `aside[role='navigation'].sidebar`. Removing it silently breaks every sidebar feature.
 * DO NOT remove or change role="navigation" under any circumstance.
 */
function DnDevSidebarComponent({
  children,
  top,
  content,
  bottom,
  defaultWidth = DEFAULT_SLOTS.sidebar.defaultWidth,
  minWidth = DEFAULT_SLOTS.sidebar.minWidth,
  maxWidth = DEFAULT_SLOTS.sidebar.maxWidth,
}: DnDevSidebarProps): ReactNode {
  // Custom mode: children provided = consumer owns zone visuals, data-custom skips polish CSS
  const isCustom = children !== undefined;
  // Resize state
  const sidebarWidth = useLayout('sidebarWidth') ?? defaultWidth;
  const setSidebarWidth = useLayout('setSidebarWidth');

  const [isDragging, setIsDragging] = useState(false);
  const tempWidthRef = useRef(sidebarWidth);
  const asideRef = useRef<HTMLElement>(null);
  const lastCollapsedRef = useRef(sidebarWidth <= 100);
  const pointerDownRef = useRef(false); // Track pointer down without starting drag

  // Calculate total width (content + handle)
  const totalWidth = sidebarWidth + RESIZE_HANDLE_WIDTH;

  // Collapsed state for compact display mode
  const isCollapsed = sidebarWidth <= 100;

  // Sync CSS variable for sidebar width (total = content width + handle width)
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--custom-sidebar-width',
      `${totalWidth}px`
    );
  }, [totalWidth]);

  // Pointer down handler - sets up drag listeners
  const handlePointerDown = () => {
    pointerDownRef.current = true;

    const handleMove = (e: PointerEvent) => {
      // Start actual drag on first move (not on pointer down - prevents double-click interference)
      if (pointerDownRef.current) {
        pointerDownRef.current = false;
        setIsDragging(true);
      }
    };

    const handleUp = () => {
      pointerDownRef.current = false;
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
  };

  // Drag move/up handlers - only active when isDragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      requestAnimationFrame(() => {
        if (!asideRef.current) return;
        // Calculate content width: mouse X - sidebar left - handle width
        const sidebarLeft = asideRef.current.getBoundingClientRect().left;
        const totalWidth = e.clientX - sidebarLeft;
        const contentWidth = totalWidth - RESIZE_HANDLE_WIDTH;
        const newWidth = Math.max(minWidth, Math.min(contentWidth, maxWidth));
        tempWidthRef.current = newWidth;
        document.documentElement.style.setProperty(
          '--custom-sidebar-width',
          `${newWidth + RESIZE_HANDLE_WIDTH}px`
        );

        // Live update collapsed state (no React re-render, just DOM attribute)
        const newCollapsed = newWidth <= 100;
        if (newCollapsed !== lastCollapsedRef.current) {
          asideRef.current.dataset.collapsed = String(newCollapsed);
          lastCollapsedRef.current = newCollapsed;
        }
      });
    };

    const handleUp = () => {
      setIsDragging(false);
      setSidebarWidth(tempWidthRef.current);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
    };
  }, [isDragging, setSidebarWidth, minWidth, maxWidth]);

  /**
   * Measure content width by temporarily showing full content.
   * Forces reflow but only on double-click/End key, so acceptable.
   */
  const measureContentWidth = (): number => {
    const aside = asideRef.current;
    if (!aside) return defaultWidth;

    // Store original state (use ref for fresh value)
    const wasCollapsed = aside.dataset.collapsed;
    const originalWidth = aside.style.width;

    // 1. Temporarily show full content (uncollapse)
    aside.dataset.collapsed = 'false';

    // 2. Let content flow naturally
    aside.style.width = 'max-content';

    // 3. Force layout recalc + measure
    const contentWidth = aside.offsetWidth - RESIZE_HANDLE_WIDTH;

    // 4. Restore original state
    aside.style.width = originalWidth;
    aside.dataset.collapsed = wasCollapsed ?? 'false';

    // 5. Return clamped value
    return Math.min(maxWidth, Math.max(minWidth, contentWidth));
  };

  /** Check if currently collapsed (reads directly from DOM - source of truth) */
  const isCurrentlyCollapsed = (): boolean => {
    return asideRef.current?.dataset.collapsed === 'true';
  };

  /** Toggle between collapsed and content-fit */
  const toggleCollapse = () => {
    if (isCurrentlyCollapsed()) {
      // Collapsed → fit to content
      setSidebarWidth(measureContentWidth());
    } else {
      // Expanded → collapse
      setSidebarWidth(minWidth);
    }
  };

  // Keyboard resize
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setSidebarWidth(Math.max(minWidth, sidebarWidth - 16));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setSidebarWidth(Math.min(maxWidth, sidebarWidth + 16));
        break;
      case 'Home':
        e.preventDefault();
        setSidebarWidth(minWidth);
        break;
      case 'End':
        e.preventDefault();
        setSidebarWidth(measureContentWidth());
        break;
      case 'Enter':
      case ' ':
        // Toggle on Enter/Space (same as double-click)
        e.preventDefault();
        toggleCollapse();
        break;
    }
  };

  return (
    /**
     * CRITICAL: role="navigation" is required.
     * ALL sidebar CSS selectors in layout-variables.css use `aside[role='navigation'].sidebar`.
     * Removing role="navigation" breaks: grid placement, display:none for no-sidebar presets,
     * resize handle styles, collapsed styles — essentially ALL sidebar behavior.
     * aria-label provides the accessible name. Both attributes are required.
     */
    <aside
      ref={asideRef}
      role="navigation"
      aria-label="Site navigation"
      className="sidebar"
      data-dragging={isDragging}
      data-collapsed={isCollapsed}
      data-custom={isCustom || undefined}
    >
      {isCustom ? (
        /* Custom mode: consumer component fills content area, no slot divs */
        children
      ) : (
        /* Slotted mode: framework slot layout with polish CSS */
        <>
          {top && <div className="sidebar-top">{top}</div>}
          <div className="sidebar-content">{content}</div>
          {bottom && <div className="sidebar-bottom">{bottom}</div>}
        </>
      )}

      {/* Resize handle - spans all rows, column 2. Always active in both modes. */}
      <div
        className="dndev-sidebar-resize-handle"
        onPointerDown={handlePointerDown}
        onDoubleClick={toggleCollapse}
        onKeyDown={handleKeyDown}
        role="separator"
        aria-label="Resize sidebar. Double-click or Enter to toggle. Home to collapse, End to fit content."
        aria-valuenow={sidebarWidth}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        aria-orientation="vertical"
        tabIndex={0}
      />
    </aside>
  );
}

export const DnDevSidebar = memo(DnDevSidebarComponent);
