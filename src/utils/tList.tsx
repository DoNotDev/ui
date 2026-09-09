// packages/ui/src/utils/tList.tsx

/**
 * @fileoverview Translated List helper
 * @description Opinionated helper for rendering translated content as List
 *
 * @version 0.1.0
 * @since 0.0.4
 * @author AMBROISE PARK Consulting
 */

import type { TFunction } from 'i18next';
import { CheckCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { List } from '@donotdev/components';
import { translateArray } from '@donotdev/core';

/**
 * Framework default icon for list items
 */
const DEFAULT_ICON = CheckCircle;

/**
 * Framework default icon size (matches --icon-sm)
 */
const DEFAULT_SIZE = 16;

/**
 * Renders a translated array as a List with optional icon
 *
 * Opinionated helper that reduces boilerplate for the common pattern:
 * `<List icon={<CheckCircle size={16} />} items={translateArray(t, key, count)} />`
 *
 * @param t - Translation function from useTranslation
 * @param key - Translation key prefix for the array
 * @param count - Maximum number of items to fetch
 * @param icon - Lucide icon, null for no icon, or undefined for default (CheckCircle)
 * @param size - Optional icon size (default: 16)
 * @returns ReactNode containing the List component
 *
 * @example
 * ```tsx
 * // With default icon (CheckCircle)
 * <Card content={tList(t, 'features.items', 4)} />
 *
 * // With custom icon
 * <Card content={tList(t, 'features.items', 4, Star)} />
 *
 * // Without icon (for emoji-prefixed labels like "🚀 Kick-off")
 * <Card content={tList(t, 'features.items', 4, null)} />
 * ```
 */
export function tList(
  t: TFunction,
  key: string,
  count: number,
  icon: LucideIcon | null = DEFAULT_ICON,
  size: number = DEFAULT_SIZE
): ReactNode {
  const Icon = icon;
  const iconElement = Icon ? <Icon size={size} /> : undefined;
  return (
    <List
      icon={iconElement}
      items={translateArray(t, key, count)}
      style={{ listStyle: 'none', paddingInlineStart: 0 }}
    />
  );
}
