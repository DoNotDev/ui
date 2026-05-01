// packages/ui/src/internal/layout/config/presets/landing.tsx

/**
 * @fileoverview Landing Preset Configuration
 * @description Marketing site layout with header and footer.
 * Optimized for landing pages and public content.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { DISPLAY } from '@donotdev/components';
import { LanguageSelector } from '@donotdev/core';
import type { PresetConfig } from '@donotdev/core';

import { AuthHeader } from '../../../../components/auth';
import {
  AppBranding,
  HeaderMenu,
  ThemeToggle,
} from '../../../../components/layout/components';
import { GoTo } from '../../../../routing/GoTo';

/**
 * Landing preset - marketing site layout
 *
 * Zones:
 * - Header: AppBranding (left), GoTo + Auth + Language + Theme (right)
 * - Footer: Automatic footer (copyright + legal links + DoNotDev branding)
 * - No sidebar
 *
 * Mobile behavior:
 * - Header start: AppBranding COMPACT (logo only)
 * - Header end: HeaderMenu hamburger wrapping desktop end content
 */
export const landingPreset: PresetConfig = {
  name: 'landing',

  header: {
    start: () => <AppBranding />,
    end: () => (
      <>
        <GoTo display={DISPLAY.AUTO} />
        <AuthHeader display={DISPLAY.AUTO} />
        <LanguageSelector display={DISPLAY.COMPACT} />
        <ThemeToggle display={DISPLAY.COMPACT} />
      </>
    ),
  },

  footer: {},

  mobile: {
    header: {
      start: () => <AppBranding display={DISPLAY.COMPACT} />,
      end: () => (
        <HeaderMenu>
          <GoTo display={DISPLAY.AUTO} />
          <AuthHeader display={DISPLAY.AUTO} />
          <LanguageSelector display={DISPLAY.COMPACT} />
          <ThemeToggle display={DISPLAY.COMPACT} />
        </HeaderMenu>
      ),
    },
  },
};
