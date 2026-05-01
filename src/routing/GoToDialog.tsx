// packages/ui/src/routing/GoToDialog.tsx

/**
 * @fileoverview GoToDialog - Navigation command palette implementation
 * @description Clean Cmd+K navigation with favorites, recents, and smart filtering
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Link as LinkIcon, Star } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import { Badge, Command, CommandDialog } from '@donotdev/components';
import type {
  CommandGroup as CommandGroupType,
  CommandItem as CommandItemType,
} from '@donotdev/components';
import { useOverlayStore, useTranslation } from '@donotdev/core';

import { useGoTo } from './useGoTo';
import { Icon } from '../components/common/icon';

import type { NavigationItem } from './useNavigation';
import type { ComponentType } from 'react';

/**
 * Navigation dialog content
 */
const GoToDialogContent: ComponentType = () => {
  const { t } = useTranslation('dndev');
  const inputRef = useRef<HTMLInputElement>(null);

  // Store state
  const isCommandDialogOpen = useOverlayStore(
    (state) => state.isCommandDialogOpen
  );

  const closeCommandDialog = useOverlayStore(
    (state) => state.closeCommandDialog
  );

  // Navigation hook
  const {
    navigationItems,
    favoriteItems,
    recentItems,
    toggleFavorite,
    isFavorite,
    navigateToItem,
  } = useGoTo();

  // Focus input when dialog opens
  useEffect(() => {
    if (isCommandDialogOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isCommandDialogOpen]);

  // Handle item selection
  const handleSelect = useCallback(
    (path: string) => {
      navigateToItem(path);
      closeCommandDialog();
    },
    [navigateToItem, closeCommandDialog]
  );

  // Build command items from navigation items
  const createItems = useCallback(
    (items: NavigationItem[], showFavorite: boolean = true) => {
      return items.map(
        (item): CommandItemType => ({
          label: item.label,
          value: item.path,
          description: item.path !== item.label ? item.path : undefined,
          icon: <Icon icon={item.icon} fallback={LinkIcon} />,
          badge: item.badge ? <Badge>{item.badge}</Badge> : undefined,
          onSelect: () => handleSelect(item.path),
          rightSlot: showFavorite ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(item.path);
              }}
              className="dndev-command-favorite-button"
              data-favorited={isFavorite(item.path)}
              aria-label={
                isFavorite(item.path)
                  ? t('globalGoTo.unfavorite', 'Remove from favorites')
                  : t('globalGoTo.favorite', 'Add to favorites')
              }
            >
              <Icon icon={Star} className="dndev-size-sm" />
            </button>
          ) : undefined,
        })
      );
    },
    [handleSelect, toggleFavorite, isFavorite, t]
  );

  // Build command groups
  const commandGroups: CommandGroupType[] = [];

  if (favoriteItems.length > 0) {
    commandGroups.push({
      heading: t('globalGoTo.favorites', 'Favorites'),
      items: createItems(favoriteItems, false),
    });
  }

  if (recentItems.length > 0) {
    const recentCommandItems = recentItems.flatMap((item) =>
      createItems([item], true)
    );

    if (recentCommandItems.length > 0) {
      commandGroups.push({
        heading: t('globalGoTo.recent', 'Recent'),
        separator: favoriteItems.length > 0,
        items: recentCommandItems,
      });
    }
  }

  commandGroups.push({
    heading: t('globalGoTo.allPages', 'All Pages'),
    separator: favoriteItems.length > 0 || recentItems.length > 0,
    items: createItems(navigationItems),
  });

  const hasResults = navigationItems.length > 0;

  return (
    <CommandDialog
      open={isCommandDialogOpen}
      onOpenChange={(open: boolean) => (open ? null : closeCommandDialog())}
    >
      <Command
        placeholder={t('globalGoTo.placeholder', 'Search pages...')}
        emptyMessage={
          hasResults
            ? t('globalGoTo.noResults', 'No results found.')
            : t('globalGoTo.empty', 'No pages available.')
        }
        groups={commandGroups as any}
      />
      <div className="dndev-command-footer">
        <div className="dndev-command-footer-shortcuts">
          <div className="dndev-command-footer-shortcut">
            <kbd className="dndev-command-footer-key">⌘K</kbd>
            <span>{t('globalGoTo.shortcutOpen', 'Open')}</span>
          </div>
          <div className="dndev-command-footer-shortcut">
            <kbd className="dndev-command-footer-key">↑</kbd>
            <kbd className="dndev-command-footer-key">↓</kbd>
            <span>{t('globalGoTo.shortcutNavigate', 'Navigate')}</span>
          </div>
          <div className="dndev-command-footer-shortcut">
            <kbd className="dndev-command-footer-key">↵</kbd>
            <span>{t('globalGoTo.shortcutSelect', 'Select')}</span>
          </div>
          <div className="dndev-command-footer-shortcut">
            <kbd className="dndev-command-footer-key">Esc</kbd>
            <span>{t('globalGoTo.shortcutClose', 'Close')}</span>
          </div>
        </div>
      </div>
    </CommandDialog>
  );
};

/**
 * GoToDialog - Navigation command palette
 * Only renders when dialog is open
 */
const GoToDialog: ComponentType = () => {
  const isCommandDialogOpen = useOverlayStore(
    (state) => state.isCommandDialogOpen
  );

  if (!isCommandDialogOpen) {
    return null;
  }

  return <GoToDialogContent />;
};

export default GoToDialog;
