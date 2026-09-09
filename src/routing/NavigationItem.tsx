// packages/ui/src/routing/NavigationItem.tsx

/**
 * @fileoverview NavigationItem component
 * @description Universal navigation item component with icon and label
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Link as LinkIcon } from 'lucide-react';
import type { ComponentType } from 'react';

import { navigationMenuTriggerStylePrimitive } from '@donotdev/components';
import type { NavigationRoute } from '@donotdev/core';

import { Link } from './Link';
import { useNavigationItems } from './useNavigation';
import { Icon } from '../components/common/icon';

/**
 * Props for NavigationItemComponent.
 *
 * Source (mutually exclusive):
 * - `path` — auto-resolves label, icon, and active state from the navigation store
 * - `route` — explicit route object (use when the route is not registered in the store)
 */
export type NavigationItemProps = (
  | { path: string; route?: never }
  | { route: NavigationRoute; path?: never }
) & {
  showIcons?: boolean;
};

/**
 * Universal NavigationItem component — nav-trigger style link with icon + label.
 *
 * Used internally in menus, sidebars, and dropdowns.
 * Pass `path` to auto-resolve label, icon, and active state from the navigation store.
 * Pass `route` for an explicit one-off item not registered in the store.
 *
 * For standalone Button-style navigation (e.g. header end slot), use
 * `useNavigationRoute(path)` and compose with `Button` + `render` prop directly.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 *
 * @example
 * ```tsx
 * <NavigationItemComponent path="/pricing" />
 * <NavigationItemComponent route={{ path: '/pricing', label: t('pricing'), icon: Tag }} />
 * ```
 */
export const NavigationItemComponent: ComponentType<NavigationItemProps> = ({
  path,
  route: routeProp,
  showIcons = true,
}) => {
  const allItems = useNavigationItems();
  const route = routeProp ?? allItems.find((item) => item.path === path);

  if (!route) return null;

  const hasIcon = showIcons && !!route.icon;
  const hasLabel = !!route.label;

  return (
    <Link
      path={route.path}
      className={navigationMenuTriggerStylePrimitive()}
      {...(hasIcon && !hasLabel && { 'data-display': 'compact' })}
    >
      {showIcons && <Icon icon={route.icon} fallback={LinkIcon} />}
      <span>{route.label}</span>
    </Link>
  );
};
