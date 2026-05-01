// packages/ui/src/internal/layout/config/presets/blog.tsx

/**
 * @fileoverview Blog Preset Configuration
 * @description Blog layout with header, sidebar, and footer.
 * Optimized for content-focused sites.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { PresetConfig } from '@donotdev/core';

import { DEFAULT_SLOTS } from '../defaults';

/**
 * Blog preset - content-focused layout
 *
 * Zones:
 * - Header: Logo + title (left), actions (right)
 * - Sidebar: Categories/tags navigation
 * - Footer: Automatic footer (copyright + legal links + DoNotDev branding)
 *
 * Mobile behavior:
 * - MergedBar at bottom (48px trigger → sheet)
 * - Maximizes reading space
 */
export const blogPreset: PresetConfig = {
  name: 'blog',

  // header omitted → uses DEFAULT_SLOTS.header
  // sidebar omitted → uses DEFAULT_SLOTS.sidebar
  footer: {},

  mobile: {
    mergedBar: {
      position: 'bottom',
      // Desktop → Mobile mapping:
      trigger: DEFAULT_SLOTS.header.start, // header.start → trigger (AppBranding)
      top: DEFAULT_SLOTS.header.center, // header.center → top (null)
      content: DEFAULT_SLOTS.sidebar.content, // sidebar.content → content (NavigationMenu)
      bottom: DEFAULT_SLOTS.header.end, // header.end → bottom (GoTo, Auth, Language, Theme)
      // Note: sidebar.bottom also has Auth+Lang+Theme, but header.end includes GoTo, so use header.end
    },
  },
};
