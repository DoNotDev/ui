// packages/ui/src/routing/useGoTo.ts

/**
 * @fileoverview useGoTo Hook - Navigation search logic
 * @description Clean hook for Cmd+K navigation with favorites, recents, and filtering
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useCallback } from 'react';

import { useNavigationStore } from '@donotdev/core';
// Platform-specific hooks via conditional exports
import { useNavigate } from '@donotdev/ui/routing/hooks';

import { useNavigationItems } from './useNavigation';

/**
 * Hook for navigation with favorites and recents
 * Command component handles search/filtering
 */
export const useGoTo = () => {
  const navigate = useNavigate();
  const navigationItems = useNavigationItems() ?? [];

  // Navigation store (favorites and recent persisted per computer)
  const favorites = useNavigationStore((state) => state.favorites);
  const recent = useNavigationStore((state) => state.recent);
  const toggleFavoriteStore = useNavigationStore(
    (state) => state.toggleFavorite
  );
  const isFavoriteStore = useNavigationStore((state) => state.isFavorite);
  const addRecentStore = useNavigationStore((state) => state.addRecent);

  // Get favorite items
  const favoriteItems = navigationItems.length
    ? navigationItems.filter((item) => favorites.includes(item.path))
    : [];

  // Get recent items
  const recentItems = navigationItems.length
    ? navigationItems.filter((item) => recent.includes(item.path)).slice(0, 5)
    : [];

  // Toggle favorite (delegates to navigation store)
  const toggleFavorite = (path: string) => {
    toggleFavoriteStore(path);
  };

  // Check if item is favorite (delegates to navigation store)
  const isFavorite = (path: string) => isFavoriteStore(path);

  // Add to recent (delegates to navigation store)
  const addRecent = (path: string) => {
    addRecentStore(path);
  };

  // Navigate to item
  const navigateToItem = useCallback(
    (path: string) => {
      addRecent(path);
      navigate(path);
    },
    [navigate, addRecent]
  );

  return {
    navigationItems,
    favoriteItems,
    recentItems,
    toggleFavorite,
    isFavorite,
    navigateToItem,
  };
};
