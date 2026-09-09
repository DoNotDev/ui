// packages/ui/src/internal/layout/config/defaults.tsx

/**
 * @fileoverview Slot Defaults
 * @description Default slot functions for zone components.
 * All slots are functions that return ReactNode (never null in defaults).
 * Zones use these unless preset overrides.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { ReactNode } from 'react';

import { DISPLAY } from '@donotdev/components';
import { LanguageSelector } from '@donotdev/core';

import { AuthHeader } from '../../../components/auth';
import {
  AppBranding,
  ThemeToggle,
} from '../../../components/layout/components';
import { DnDevNavigationMenu } from '../../../routing';
import { GoTo } from '../../../routing/GoTo';

/**
 * Default slot functions - zones use these unless preset overrides
 *
 * All slots are functions, even if they return null.
 * This ensures defaults exist when switching layouts.
 */
export const DEFAULT_SLOTS = {
  header: {
    /** Default start: AppBranding (responsive logo + title) */
    start: (): ReactNode => <AppBranding display={DISPLAY.AUTO} />,

    /** Default center: empty (function exists but returns null) */
    center: (): ReactNode => null,

    /** Default end: GoTo, Auth, Language, Theme */
    end: (): ReactNode => (
      <>
        <GoTo display={DISPLAY.AUTO} />
        <AuthHeader display={DISPLAY.AUTO} />
        <LanguageSelector display={DISPLAY.AUTO} />
        <ThemeToggle display={DISPLAY.AUTO} />
      </>
    ),
  },

  sidebar: {
    /** Default top: empty (function exists but returns null) */
    top: (): ReactNode => null,

    /** Default content: Navigation menu */
    content: (): ReactNode => (
      <DnDevNavigationMenu vertical display={DISPLAY.AUTO} />
    ),

    /** Default bottom: Auth, Language, Theme */
    bottom: (): ReactNode => (
      <>
        <AuthHeader display={DISPLAY.AUTO} />
        <LanguageSelector display={DISPLAY.AUTO} />
        <ThemeToggle display={DISPLAY.AUTO} />
      </>
    ),

    /** Default dimensions */
    defaultWidth: 240,
    minWidth: 48,
    maxWidth: 400,
  },

  mobile: {
    mergedBar: {
      /** Default trigger: AppBranding */
      trigger: (): ReactNode => <AppBranding display={DISPLAY.AUTO} />,

      /** Default top: empty (function exists but returns null) */
      top: (): ReactNode => null,

      /** Default content: empty (will use sidebar.content default) */
      content: (): ReactNode => null,

      /** Default bottom: empty (will use sidebar.bottom default) */
      bottom: (): ReactNode => null,
    },
  },
};
