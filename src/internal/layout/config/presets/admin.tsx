// packages/ui/src/internal/layout/config/presets/admin.tsx

/**
 * @fileoverview Admin Preset Configuration
 * @description Admin panel layout with header, sidebar, and footer.
 * Optimized for dashboards and management interfaces.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { PresetConfig } from '@donotdev/core';

import { DEFAULT_SLOTS } from '../defaults';

/**
 * Admin preset - admin panel layout
 *
 * Zones:
 * - Header: Logo + title (left), GoTo + Auth + Language + Theme (right)
 * - Sidebar: Navigation menu only (no bottom controls - they're in header)
 * - Footer: Automatic footer (copyright + legal links + DoNotDev branding)
 *
 * Mobile behavior:
 * - MergedBar at top (64px trigger → sheet)
 * - Sidebar hidden, content in sheet
 */
export const adminPreset: PresetConfig = {
  name: 'admin',

  // header omitted → uses DEFAULT_SLOTS.header (GoTo + Auth + Language + Theme)
  sidebar: {
    // content omitted → uses DEFAULT_SLOTS.sidebar.content (NavigationMenu)
    // bottom explicitly empty - Auth/Language/Theme are in header, no duplication
    bottom: () => null,
  },
  footer: {},

  mobile: {
    mergedBar: {
      position: 'top',
      height: 'var(--header-height)',
      // Desktop → Mobile mapping:
      trigger: DEFAULT_SLOTS.header.start, // header.start → trigger (AppBranding)
      top: DEFAULT_SLOTS.header.center, // header.center → top (null)
      content: DEFAULT_SLOTS.sidebar.content, // sidebar.content → content (NavigationMenu)
      bottom: DEFAULT_SLOTS.header.end, // header.end → bottom (GoTo, Auth, Language, Theme)
    },
  },
};
