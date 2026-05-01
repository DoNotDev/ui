// packages/ui/src/internal/layout/config/presets/moolti.tsx

/**
 * @fileoverview Moolti Preset Configuration
 * @description SaaS app layout with sidebar only (no header/footer zones).
 * All UI in sidebar for focused productivity.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { DISPLAY, Stack } from '@donotdev/components';
import { LanguageSelector } from '@donotdev/core';
import type { PresetConfig } from '@donotdev/core';

import { AuthHeader } from '../../../../components/auth';
import {
  AppBranding,
  ThemeToggle,
} from '../../../../components/layout/components';
import { DnDevNavigationMenu, GoTo } from '../../../../routing';
import { FooterCopyright, FooterLegalLinks } from '../../components';

const sidebarTop = () => <AppBranding display={DISPLAY.AUTO} />;

const sidebarContent = () => (
  <>
    <GoTo display={DISPLAY.AUTO} />
    <DnDevNavigationMenu vertical display={DISPLAY.AUTO} />
  </>
);

const sidebarBottom = () => (
  <Stack direction="column" gap="tight" align="stretch">
    <AuthHeader display={DISPLAY.AUTO} />
    <LanguageSelector display={DISPLAY.AUTO} />
    <ThemeToggle display={DISPLAY.AUTO} />
    <FooterLegalLinks direction="column" />
    <FooterCopyright />
  </Stack>
);

/**
 * Moolti preset - SaaS app layout
 *
 * Zones:
 * - No header zone (branding in sidebar)
 * - Sidebar: AppIcon + AppTitle top, GoTo + navigation, settings/footer at bottom
 * - No footer zone (footer content in sidebar)
 *
 * Mobile behavior:
 * - MergedBar at top (64px trigger → sheet)
 * - Full sidebar content in sheet
 */
export const mooltiPreset: PresetConfig = {
  name: 'moolti',

  sidebar: {
    top: sidebarTop,
    content: sidebarContent,
    bottom: sidebarBottom,
    defaultWidth: 256,
    minWidth: 48,
    maxWidth: 400,
  },

  mobile: {
    mergedBar: {
      position: 'top',
      trigger: sidebarTop,
      top: () => null,
      content: sidebarContent,
      bottom: sidebarBottom,
    },
  },
};
