// packages/ui/src/components/layout/components/header/SettingsMenu.tsx

/**
 * @fileoverview SettingsMenu component
 * @description Settings dropdown menu with theme, language, and cache settings
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Settings, Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

import {
  Button,
  BUTTON_VARIANT,
  DropdownMenu,
  Stack,
  DISPLAY,
} from '@donotdev/components';
import type { ButtonVariant, DropdownMenuItemData } from '@donotdev/components';
import { useTranslation } from '@donotdev/core';
import {
  useLanguageSelector,
  useTheme,
  type ThemeInfo,
  Flag,
} from '@donotdev/core';

import CacheSettings from './CacheSettings';
import { AuthHeader } from '../../../auth/AuthHeader';

import type { ComponentType } from 'react';

/** Props for the SettingsMenu component. */
export interface SettingsMenuProps {
  /** Button variant */
  variant?: ButtonVariant;
}

/**
 * SettingsMenu with fixed hooks order and error protection
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
function SettingsMenu({
  variant = BUTTON_VARIANT.OUTLINE,
}: SettingsMenuProps = {}) {
  const { t } = useTranslation('dndev');
  const { languages, currentLanguage, changeLanguage, isLoading } =
    useLanguageSelector();
  const availableThemes = useTheme('availableThemes');
  const currentThemeName = useTheme('currentTheme');
  const setTheme = useTheme('setTheme');

  const getIcon = (
    iconName: string | undefined
  ): ComponentType<{ className?: string }> => {
    if (!iconName) return LucideIcons.Palette;
    const cleanIconName = iconName.replace(/['"]/g, '');
    return (LucideIcons as any)[cleanIconName] || LucideIcons.Palette;
  };

  const themeItems: DropdownMenuItemData[] = availableThemes.map(
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

  const languageItems: DropdownMenuItemData[] = languages.map((language) => {
    const isActive = language.id === currentLanguage;
    return {
      label: language.name,
      onClick: () => changeLanguage(language.id),
      disabled: isLoading,
      checked: isActive,
      className: isActive ? 'bg-accent' : undefined,
      iconEnd: isActive && !isLoading ? Check : undefined,
      children: (
        <Stack direction="row" align="center" gap="tight">
          <Flag
            code={language.flagCode || language.id}
            title={`${language.name} flag`}
          />
          <span>{language.name}</span>
          {isLoading && isActive && (
            <div style={{ marginInlineStart: 'auto' }}>
              <div
                style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                }}
              />
            </div>
          )}
        </Stack>
      ),
    };
  });

  const items: DropdownMenuItemData[] = [
    {
      label: t('auth.title', 'Authentication'),
      subContent: <AuthHeader display={DISPLAY.COMPACT} />,
    },
    {
      label: t('settings.theme', 'Theme'),
      subItems: themeItems,
    },
    {
      label: t('settings.language', 'Language'),
      subItems: languageItems,
    },
    {
      label: t('settings.clearCache.title', 'Clear Cache'),
      subContent: <CacheSettings />,
    },
  ];

  return (
    <DropdownMenu
      trigger={
        <Button
          variant={variant}
          aria-label={t('settings.title', 'Settings')}
          icon={Settings}
        />
      }
      items={items}
      contentWidth="14rem"
      contentAlign="end"
    />
  );
}

export default SettingsMenu;
