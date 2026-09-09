'use client';
// packages/ui/src/components/layout/components/header/ThemeToggle.tsx

/**
 * @fileoverview ThemeToggle component
 * @description Theme switching component with dropdown menu
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import * as LucideIcons from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import {
  Button,
  BUTTON_VARIANT,
  DropdownMenu,
  DISPLAY,
} from '@donotdev/components';
import type { DropdownMenuItemData } from '@donotdev/components';
import { useTranslation } from '@donotdev/core';
import { useTheme } from '@donotdev/core';
import type { ThemeInfo } from '@donotdev/core';

interface ThemeToggleProps {
  /**
   * Display mode for theme toggle
   * - 'compact': Icon-only button
   * - 'full': Current theme label + icon
   * - 'auto': Responsive (default)
   * @default 'auto'
   */
  display?: (typeof DISPLAY)[keyof typeof DISPLAY];
  'no-tooltip'?: boolean;
}

const getIcon = (
  iconName: string | undefined
): ComponentType<{ className?: string }> => {
  if (!iconName) return LucideIcons.Palette;
  const cleanIconName = iconName.replace(/['"]/g, '');
  return (LucideIcons as any)[cleanIconName] || LucideIcons.Palette;
};

/**
 * ThemeToggle - Theme switching component
 *
 * Allows users to switch between available themes (light, dark, system, custom).
 * Integrates with the theme store for state management.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const ThemeToggle: ComponentType<ThemeToggleProps> = ({
  display = DISPLAY.AUTO,
  'no-tooltip': noTooltip = false,
}) => {
  const { t } = useTranslation('dndev');
  const availableThemes = useTheme('availableThemes');
  const currentThemeName = useTheme('currentTheme');
  const setTheme = useTheme('setTheme');

  // 0-1 theme: don't show
  if (availableThemes.length <= 1) {
    return null;
  }

  // Find current and next theme info
  // Safety: If currentThemeName doesn't exist in availableThemes (stale cache),
  // fallback to first available theme to prevent UI inconsistencies
  const currentThemeInfo =
    availableThemes.find((t: ThemeInfo) => t.name === currentThemeName) ||
    availableThemes[0];

  const nextThemeInfo =
    availableThemes.length === 2
      ? availableThemes.find(
          (t: ThemeInfo) => t.name !== currentThemeInfo?.name
        ) || availableThemes[0]
      : null;

  // Get icons
  const currentIcon = currentThemeInfo
    ? getIcon(currentThemeInfo.meta?.icon)
    : null;
  const nextIcon = nextThemeInfo ? getIcon(nextThemeInfo.meta?.icon) : null;

  const currentLabel =
    currentThemeInfo?.displayName || currentThemeInfo?.name || 'Theme';
  const nextLabel =
    nextThemeInfo?.displayName || nextThemeInfo?.name || 'Theme';

  // Determine button props based on theme count
  const isTwoThemes = availableThemes.length === 2 && nextThemeInfo && nextIcon;
  const buttonIcon = isTwoThemes ? nextIcon : currentIcon;
  const buttonTooltip = isTwoThemes
    ? !noTooltip
      ? t(
          'common.themeSelector.tooltipWithNext',
          'Change Theme: Switch to {{next}}',
          { next: nextThemeInfo?.displayName || nextThemeInfo?.name }
        )
      : undefined
    : !noTooltip
      ? t('common.themeSelector.changeTheme', 'Change Theme')
      : undefined;

  const buttonProps = {
    variant: BUTTON_VARIANT.OUTLINE,
    'aria-label': t('common.themeSelector.changeTheme', 'Change Theme'),
    tooltip: buttonTooltip,
    icon: buttonIcon,
    display,
  };

  // 2 themes: direct toggle button - show next theme (what you'll switch to)
  if (isTwoThemes && nextThemeInfo) {
    return (
      <Button {...buttonProps} onClick={() => setTheme(nextThemeInfo.name)}>
        {nextLabel}
      </Button>
    );
  }

  // 3+ themes: dropdown with current theme icon
  if (!currentThemeInfo || !currentIcon) return null;

  const items: DropdownMenuItemData[] = availableThemes.map(
    (themeInfo: ThemeInfo) => {
      const Icon = getIcon(themeInfo.meta?.icon);
      const isCurrent = themeInfo.name === currentThemeName;
      return {
        label: themeInfo.displayName || themeInfo.name,
        icon: Icon,
        onClick: () => setTheme(themeInfo.name),
        checked: isCurrent,
      };
    }
  );

  return (
    <DropdownMenu
      trigger={<Button {...buttonProps}>{currentLabel}</Button>}
      items={items}
      contentWidth="10rem"
    />
  );
};

export default ThemeToggle;
