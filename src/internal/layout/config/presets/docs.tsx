// packages/ui/src/internal/layout/config/presets/docs.tsx

/**
 * @fileoverview Docs Preset Configuration
 * @description Documentation layout with sidebar and footer (no header).
 * Maximizes vertical reading space.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { DISPLAY } from '@donotdev/components';
import type { PresetConfig } from '@donotdev/core';

import { AppBranding } from '../../../../components/layout/components';
import { GoTo } from '../../../../routing/GoTo';
import { DEFAULT_SLOTS } from '../defaults';

/**
 * Docs preset - documentation layout
 *
 * Zones:
 * - No header (maximizes vertical space)
 * - Sidebar: AppBranding + GoTo at top, navigation, settings at bottom
 * - Footer: Automatic footer (copyright + legal links + DoNotDev branding)
 *
 * Mobile behavior:
 * - MergedBar at top (64px hamburger menu → side drawer)
 * - Footer stays visible at bottom (industry standard)
 * - Sidebar content in drawer
 */
export const docsPreset: PresetConfig = {
  name: 'docs',

  sidebar: {
    top: () => (
      <>
        <AppBranding display={DISPLAY.AUTO} />
        <GoTo display={DISPLAY.AUTO} />
      </>
    ),
    // content omitted → uses DEFAULT_SLOTS.sidebar.content
    // bottom omitted → uses DEFAULT_SLOTS.sidebar.bottom
    defaultWidth: 300,
    minWidth: 48,
    maxWidth: 400,
  },

  footer: {},

  mobile: {
    mergedBar: {
      position: 'top',
      height: 'var(--header-height)',
      // Desktop → Mobile mapping:
      trigger: () => <AppBranding display={DISPLAY.AUTO} />, // sidebar.top (AppBranding) → trigger
      top: () => <GoTo display={DISPLAY.AUTO} />, // sidebar.top (GoTo) → top
      content: DEFAULT_SLOTS.sidebar.content, // sidebar.content → content (NavigationMenu)
      bottom: DEFAULT_SLOTS.sidebar.bottom, // sidebar.bottom → bottom (Auth, Language, Theme)
    },
  },
};
