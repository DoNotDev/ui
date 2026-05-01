// packages/ui/src/internal/layout/config/presets/game.tsx

/**
 * @fileoverview Game Preset Configuration
 * @description Mobile gaming layout with centered title.
 * Optimized for full-screen gaming experiences.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { DISPLAY } from '@donotdev/components';
import type { PresetConfig } from '@donotdev/core';
import { LanguageSelector } from '@donotdev/core';

import { AuthHeader } from '../../../../components/auth';
import {
  GameTitle,
  ThemeToggle,
} from '../../../../components/layout/components';
import { FooterCopyright } from '../../components/footer/FooterCopyright';
import { FooterLegalLinks } from '../../components/footer/FooterLegalLinks';
import { DEFAULT_SLOTS } from '../defaults';

/**
 * Game preset - mobile gaming layout
 *
 * Zones:
 * - Header: Empty start, GameTitle center, actions end (no GoTo)
 * - Footer: Automatic footer (hidden on mobile, merged into header)
 * - No sidebar
 *
 * Mobile behavior:
 * - MergedBar at top includes footer content
 * - Footer hidden on mobile/tablet
 */
export const gamePreset: PresetConfig = {
  name: 'game',

  header: {
    start: () => null,
    center: () => <GameTitle />,
    end: () => (
      <>
        <AuthHeader display={DISPLAY.AUTO} />
        <LanguageSelector display={DISPLAY.AUTO} />
        <ThemeToggle display={DISPLAY.AUTO} />
      </>
    ),
  },

  footer: {},

  mobile: {
    mergedBar: {
      position: 'top',
      // Desktop → Mobile mapping:
      trigger: () => <GameTitle />, // header.center → trigger
      top: () => (
        // header.end → top (Auth, Language, Theme)
        <>
          <AuthHeader display={DISPLAY.AUTO} />
          <LanguageSelector display={DISPLAY.AUTO} />
          <ThemeToggle display={DISPLAY.AUTO} />
        </>
      ),
      content: DEFAULT_SLOTS.sidebar.content, // Navigation menu
      bottom: () => (
        // Footer content: copyright + legal links (includes branding)
        <>
          <FooterCopyright />
          <FooterLegalLinks />
        </>
      ),
    },
  },
};
