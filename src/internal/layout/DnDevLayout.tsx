'use client';
// packages/ui/src/internal/layout/DnDevLayout.tsx

/**
 * @fileoverview DnDevLayout Component
 * @description Layout orchestrator using zone components.
 * Handles CSS grid setup, data attributes, and zone rendering.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import {
  useLayoutEffect,
  useEffect,
  useRef,
  useMemo,
  Suspense,
  startTransition,
  lazy,
  type ReactNode,
} from 'react';

import { cn, Stack } from '@donotdev/components';
import type {
  LayoutPreset,
  Density,
  PresetConfig,
  LayoutConfig,
} from '@donotdev/core';
import { isClient, isNextJs, isDev, useBreakpoint } from '@donotdev/core';
import { useLayout } from '@donotdev/core';
import { useTranslation } from '@donotdev/core';
import { useAppConfig } from '@donotdev/core';
import { LAYOUT_PRESET, DENSITY } from '@donotdev/core';
import { useLocation } from '@donotdev/ui/routing/hooks';

import Breadcrumbs from '../../components/layout/components/Breadcrumbs';
import { GoToWrapper } from '../../routing';
import { DEFAULT_SLOTS } from './config/defaults';
import { presetRegistry } from './config/presets';
import {
  DnDevHeader,
  DnDevSidebar,
  DnDevFooter,
  DnDevMergedBar,
} from './zones';

const DebugTools = lazy(() => {
  return import('../devtools')
    .then((m) => {
      return { default: m.DebugTools };
    })
    .catch(() => {
      return { default: () => <></> };
    });
});

/**
 * Layout preset to density mapping
 */
const LAYOUT_DENSITY_DEFAULTS: Record<LayoutPreset, Density> = {
  [LAYOUT_PRESET.ADMIN]: DENSITY.COMPACT,
  [LAYOUT_PRESET.MOOLTI]: DENSITY.COMPACT,
  [LAYOUT_PRESET.LANDING]: DENSITY.EXPRESSIVE,
  [LAYOUT_PRESET.GAME]: DENSITY.EXPRESSIVE,
  [LAYOUT_PRESET.DOCS]: DENSITY.STANDARD,
  [LAYOUT_PRESET.BLOG]: DENSITY.STANDARD,
  [LAYOUT_PRESET.PLAIN]: DENSITY.STANDARD,
};

interface DnDevLayoutComponentProps {
  layout?: LayoutConfig;
  children?: ReactNode;
  className?: string;
}

/**
 * DnDevLayout - Layout orchestrator with zone components
 *
 * Renders CSS grid zones using dedicated zone components.
 * Handles data attributes and CSS variable overrides.
 * MergedBar is always rendered - CSS controls visibility.
 *
 * Layout preset is always read from the store via useLayout('layoutPreset').
 * The store is initialized from appConfig.preset and can be changed at runtime
 * via useLayout('setLayoutPreset').
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const DnDevLayout = ({
  children,
  layout,
  className,
}: DnDevLayoutComponentProps) => {
  // Store is single source of truth for preset
  const preset = useLayout('layoutPreset');
  const routePresetOverride = useLayout('routePresetOverride');
  const isMobile = useBreakpoint('isMobileOrTablet');
  const { app, features, customPresets } = useAppConfig();
  const debugEnabled = isDev() && features?.debug === true;

  // Subscribe to language changes for zone re-renders
  useTranslation('dndev');

  // Layout config props
  const breadcrumbs = layout?.breadcrumbs ?? 'smart';
  const routeHideBreadcrumbs = useLayout('routeHideBreadcrumbs');

  // Route detection for animations
  const location = useLocation();
  const pathname = location.pathname;
  const mainRef = useRef<HTMLElement>(null);

  // Platform content handling
  const content = children;

  // Merge custom presets with built-in registry
  const effectiveRegistry = useMemo((): Record<string, PresetConfig> => {
    if (!customPresets) return presetRegistry;
    return { ...presetRegistry, ...customPresets };
  }, [customPresets]);

  // Effective preset: route override > app default > fallback
  const effectivePreset: LayoutPreset = useMemo(() => {
    return routePresetOverride || preset || 'landing';
  }, [routePresetOverride, preset]);

  // Get preset config (presets only override what's different, defaults fill the rest)
  const config = useMemo((): PresetConfig => {
    const presetConfig = (effectiveRegistry[effectivePreset] ??
      presetRegistry.landing) as PresetConfig;
    return {
      name: presetConfig.name,
      header: presetConfig.header,
      sidebar: presetConfig.sidebar,
      footer: presetConfig.footer,
      footerMode: presetConfig.footerMode,
      mobile: presetConfig.mobile,
    };
  }, [effectivePreset, effectiveRegistry]);

  // Footer mode: consumer layout prop > preset config > default (mobile=scroll, desktop=fixed)
  const footerMode = layout?.footerMode ?? config.footerMode;
  const footerInline =
    footerMode === 'scroll' || (isMobile && footerMode !== 'fixed');

  // Resolve header with consumer overrides
  const resolvedHeader = useMemo(() => {
    // Function = custom mode: consumer owns zone visuals, DnDevHeader wraps with structural behavior
    if (typeof layout?.header === 'function') {
      return (
        <DnDevHeader>
          <layout.header />
        </DnDevHeader>
      );
    }
    if (typeof config.header === 'function') {
      return (
        <DnDevHeader>{(config.header as () => React.ReactNode)()}</DnDevHeader>
      );
    }

    // Determine effective header config (mobile overrides desktop when on mobile)
    const effectiveHeader = isMobile
      ? layout?.mobile?.header ||
        config.mobile?.header ||
        layout?.header ||
        config.header
      : layout?.header || config.header;

    if (effectiveHeader && typeof effectiveHeader === 'object') {
      // Priority: consumer mobile > preset mobile > consumer desktop > preset desktop > defaults
      const startSlot =
        isMobile && layout?.mobile?.header?.start !== undefined
          ? layout.mobile.header.start
          : isMobile && config.mobile?.header?.start !== undefined
            ? config.mobile.header.start
            : layout?.header &&
                typeof layout.header === 'object' &&
                layout.header.start !== undefined
              ? layout.header.start
              : (config.header?.start ?? DEFAULT_SLOTS.header.start);
      const centerSlot =
        isMobile && layout?.mobile?.header?.center !== undefined
          ? layout.mobile.header.center
          : isMobile && config.mobile?.header?.center !== undefined
            ? config.mobile.header.center
            : layout?.header &&
                typeof layout.header === 'object' &&
                layout.header.center !== undefined
              ? layout.header.center
              : (config.header?.center ?? DEFAULT_SLOTS.header.center);
      const endSlot =
        isMobile && layout?.mobile?.header?.end !== undefined
          ? layout.mobile.header.end
          : isMobile && config.mobile?.header?.end !== undefined
            ? config.mobile.header.end
            : layout?.header &&
                typeof layout.header === 'object' &&
                layout.header.end !== undefined
              ? layout.header.end
              : (config.header?.end ?? DEFAULT_SLOTS.header.end);
      return (
        <DnDevHeader
          start={startSlot()}
          center={centerSlot()}
          end={endSlot()}
        />
      );
    }
    // No consumer override - use preset or defaults
    const effectiveStartSlot = isMobile
      ? (config.mobile?.header?.start ??
        config.header?.start ??
        DEFAULT_SLOTS.header.start)
      : (config.header?.start ?? DEFAULT_SLOTS.header.start);
    const effectiveCenterSlot = isMobile
      ? (config.mobile?.header?.center ??
        config.header?.center ??
        DEFAULT_SLOTS.header.center)
      : (config.header?.center ?? DEFAULT_SLOTS.header.center);
    const effectiveEndSlot = isMobile
      ? (config.mobile?.header?.end ??
        config.header?.end ??
        DEFAULT_SLOTS.header.end)
      : (config.header?.end ?? DEFAULT_SLOTS.header.end);
    return (
      <DnDevHeader
        start={effectiveStartSlot()}
        center={effectiveCenterSlot()}
        end={effectiveEndSlot()}
      />
    );
  }, [layout?.header, layout?.mobile?.header, config, isMobile]);

  // Resolve sidebar with consumer overrides
  const resolvedSidebar = useMemo(() => {
    // Function = custom mode: consumer owns zone visuals, DnDevSidebar wraps with resize behavior
    if (typeof layout?.sidebar === 'function') {
      return (
        <DnDevSidebar>
          <layout.sidebar />
        </DnDevSidebar>
      );
    }
    if (typeof config.sidebar === 'function') {
      return (
        <DnDevSidebar>
          {(config.sidebar as () => React.ReactNode)()}
        </DnDevSidebar>
      );
    }
    if (layout?.sidebar && typeof layout.sidebar === 'object') {
      // If consumer provides a function (including () => null), use it; otherwise fall back
      const topSlot =
        layout.sidebar.top !== undefined
          ? layout.sidebar.top
          : (config.sidebar?.top ?? DEFAULT_SLOTS.sidebar.top);
      const contentSlot =
        layout.sidebar.content !== undefined
          ? layout.sidebar.content
          : (config.sidebar?.content ?? DEFAULT_SLOTS.sidebar.content);
      const bottomSlot =
        layout.sidebar.bottom !== undefined
          ? layout.sidebar.bottom
          : (config.sidebar?.bottom ?? DEFAULT_SLOTS.sidebar.bottom);
      return (
        <DnDevSidebar
          top={topSlot()}
          content={contentSlot()}
          bottom={bottomSlot()}
          defaultWidth={
            config.sidebar?.defaultWidth ?? DEFAULT_SLOTS.sidebar.defaultWidth
          }
          minWidth={config.sidebar?.minWidth ?? DEFAULT_SLOTS.sidebar.minWidth}
          maxWidth={config.sidebar?.maxWidth ?? DEFAULT_SLOTS.sidebar.maxWidth}
        />
      );
    }
    // No consumer override - use preset or defaults
    const topSlot = config.sidebar?.top ?? DEFAULT_SLOTS.sidebar.top;
    const contentSlot =
      config.sidebar?.content ?? DEFAULT_SLOTS.sidebar.content;
    const bottomSlot = config.sidebar?.bottom ?? DEFAULT_SLOTS.sidebar.bottom;
    return (
      <DnDevSidebar
        top={topSlot()}
        content={contentSlot()}
        bottom={bottomSlot()}
        defaultWidth={
          config.sidebar?.defaultWidth ?? DEFAULT_SLOTS.sidebar.defaultWidth
        }
        minWidth={config.sidebar?.minWidth ?? DEFAULT_SLOTS.sidebar.minWidth}
        maxWidth={config.sidebar?.maxWidth ?? DEFAULT_SLOTS.sidebar.maxWidth}
      />
    );
  }, [layout?.sidebar, config.sidebar]);

  // Resolve footer with consumer overrides
  const resolvedFooter = useMemo(() => {
    // Function = custom mode: consumer owns zone visuals, DnDevFooter wraps with structural behavior
    if (layout?.footer) {
      return (
        <DnDevFooter>
          <layout.footer />
        </DnDevFooter>
      );
    }
    if (config.footer === null) {
      return null;
    }
    if (typeof config.footer === 'function') {
      return (
        <DnDevFooter>{(config.footer as () => React.ReactNode)()}</DnDevFooter>
      );
    }
    return <DnDevFooter app={app} />;
  }, [layout?.footer, config.footer, app]);

  // Resolve mergedbar with consumer overrides
  const resolvedMergedBar = useMemo(() => {
    if (!config.mobile?.mergedBar) return null;
    if (typeof layout?.mergedbar === 'function') {
      return <layout.mergedbar />;
    }
    const mergedBarConfig = config.mobile.mergedBar;
    // Narrow zone configs: function zones don't provide slots for mergedBar fallback
    const headerSlots =
      typeof config.header === 'object' ? config.header : undefined;
    const sidebarSlots =
      typeof config.sidebar === 'object' ? config.sidebar : undefined;
    // Consumer sidebar/mobile.sidebar overrides propagate to mergedBar when not explicitly overridden
    const layoutSidebarSlots =
      layout?.sidebar && typeof layout.sidebar === 'object'
        ? layout.sidebar
        : undefined;
    const layoutMobileSidebarSlots = layout?.mobile?.sidebar;
    if (layout?.mergedbar && typeof layout.mergedbar === 'object') {
      // If consumer provides a function (including () => null), use it; otherwise fall back
      const triggerSlot =
        layout.mergedbar.trigger !== undefined
          ? layout.mergedbar.trigger
          : (mergedBarConfig.trigger ??
            headerSlots?.start ??
            DEFAULT_SLOTS.header.start);
      const topSlot =
        layout.mergedbar.top !== undefined
          ? layout.mergedbar.top
          : (layoutMobileSidebarSlots?.top ??
            layoutSidebarSlots?.top ??
            mergedBarConfig.top ??
            DEFAULT_SLOTS.mobile.mergedBar.top);
      const contentSlot =
        layout.mergedbar.content !== undefined
          ? layout.mergedbar.content
          : (layoutMobileSidebarSlots?.content ??
            layoutSidebarSlots?.content ??
            mergedBarConfig.content ??
            sidebarSlots?.content ??
            DEFAULT_SLOTS.sidebar.content);
      const bottomSlot =
        layout.mergedbar.bottom !== undefined
          ? layout.mergedbar.bottom
          : (layoutMobileSidebarSlots?.bottom ??
            layoutSidebarSlots?.bottom ??
            mergedBarConfig.bottom ??
            sidebarSlots?.bottom ??
            DEFAULT_SLOTS.sidebar.bottom);
      return (
        <DnDevMergedBar
          position={mergedBarConfig.position}
          height={mergedBarConfig.height}
          trigger={triggerSlot()}
          top={topSlot()}
          content={contentSlot()}
          bottom={bottomSlot()}
        />
      );
    }
    // No consumer override - use preset or defaults
    const triggerSlot =
      mergedBarConfig.trigger ??
      headerSlots?.start ??
      DEFAULT_SLOTS.header.start;
    const topSlot =
      layoutMobileSidebarSlots?.top ??
      layoutSidebarSlots?.top ??
      mergedBarConfig.top ??
      DEFAULT_SLOTS.mobile.mergedBar.top;
    const contentSlot =
      layoutMobileSidebarSlots?.content ??
      layoutSidebarSlots?.content ??
      mergedBarConfig.content ??
      sidebarSlots?.content ??
      DEFAULT_SLOTS.sidebar.content;
    const bottomSlot =
      layoutMobileSidebarSlots?.bottom ??
      layoutSidebarSlots?.bottom ??
      mergedBarConfig.bottom ??
      sidebarSlots?.bottom ??
      DEFAULT_SLOTS.sidebar.bottom;
    return (
      <DnDevMergedBar
        position={mergedBarConfig.position}
        height={mergedBarConfig.height}
        trigger={triggerSlot()}
        top={topSlot()}
        content={contentSlot()}
        bottom={bottomSlot()}
      />
    );
  }, [layout?.mergedbar, layout?.sidebar, layout?.mobile?.sidebar, config]);

  // Apply routing animation data attribute (useLayoutEffect = before paint)
  useLayoutEffect(() => {
    if (!isClient() || !mainRef.current) return;

    const routingAnimation =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--routing-animation')
        .trim() || 'none';

    mainRef.current.setAttribute('data-routing-animation', routingAnimation);
  }, [pathname]);

  const effectiveDensity = effectivePreset
    ? LAYOUT_DENSITY_DEFAULTS[effectivePreset] || DENSITY.STANDARD
    : undefined;

  // Mirror the preset onto <html>. Client-only by nature (documentElement is not
  // ours to render), so it lands after hydration — which is why the same
  // attributes are rendered on the wrapper below. Kept because a handful of rules
  // are scoped to :root[data-layout=...] rather than to a descendant.
  useLayoutEffect(() => {
    if (!isClient() || !effectivePreset) return;

    const updateDOM = () => {
      const root = document.documentElement;
      root.setAttribute('data-layout', effectivePreset);
      if (effectiveDensity) root.setAttribute('data-density', effectiveDensity);
    };

    startTransition(updateDOM);
  }, [effectivePreset, effectiveDensity]);

  return (
    // data-layout / data-density are rendered here, not only pushed onto <html>
    // by the effect above: a preset hides its chrome through CSS
    // (`[data-layout='plain'] header[role='banner'] { display: none }`), and
    // header, sidebar and footer are all descendants of this wrapper. Setting the
    // attribute only from a client effect — deferred further by startTransition —
    // meant the server shipped the full chrome with nothing to hide it, so every
    // first paint flashed a header and a sidebar the preset had removed.
    <div
      className={cn('dndev-layout', className)}
      data-layout={effectivePreset || undefined}
      data-density={effectiveDensity}
      data-footer-inline={footerInline || undefined}
      data-has-mergedbar={resolvedMergedBar ? '' : undefined}
    >
      {/* Header zone - CSS hides on mobile for mergedBar presets */}
      {resolvedHeader}

      {/* Sidebar zone - CSS hides on mobile or when width is 0 */}
      {resolvedSidebar}

      {/* Main content zone */}
      <main ref={mainRef} role="main" className="main">
        {breadcrumbs !== 'never' && !routeHideBreadcrumbs && (
          <div className="breadcrumbs-container">
            <Breadcrumbs
              variant={breadcrumbs === 'always' ? 'default' : 'smart'}
            />
          </div>
        )}

        {debugEnabled && (
          <Suspense fallback={null}>
            <DebugTools />
          </Suspense>
        )}

        {layout?.wrapper ? layout.wrapper({ children: content }) : content}
        {footerInline && resolvedFooter}
      </main>

      {/* Footer in grid zone when not inline */}
      {!footerInline && resolvedFooter}

      {/* MergedBar zone - CSS shows on mobile only */}
      {resolvedMergedBar}

      <GoToWrapper />
    </div>
  );
};
