// packages/ui/src/components/layout/components/DropdownNavigation.tsx

/**
 * @fileoverview DropdownNavigation Component
 * @description Professional, prop-driven navigation bar with dropdown support for layout presets.
 *
 * Features:
 * - Accepts a navigation prop (array of menu/submenu objects)
 * - Renders top-level menu items and dropdowns (using @donotdev/components/dropdown-menu)
 * - Keyboard accessible and ARIA compliant
 * - No hardcoded content, fully customizable
 * - CSS variable support for theming
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { DropdownMenu, Button, cn, Stack } from '@donotdev/components';
import type { DropdownMenuItemData } from '@donotdev/components';
import type { NavigationRoute } from '@donotdev/core';

import { Link } from '../../../routing/Link';
import { NavigationItemComponent } from '../../../routing/NavigationItem';

import type { ComponentType, ReactNode } from 'react';

/**
 * Navigation menu item type (can have subroutes for dropdowns).
 */
export interface NavigationMenuItem {
  label: string;
  routes?: NavigationRoute[];
  path?: string; // If no routes, acts as a direct link
  icon?: ReactNode;
}

/**
 * Props for DropdownNavigation component.
 */
export interface DropdownNavigationProps {
  navigation: NavigationMenuItem[];
  className?: string;
}

/**
 * DropdownNavigation component - professional navigation with dropdown support
 *
 * Renders a navigation bar with dropdown menus for complex navigation structures.
 * Supports both direct links and dropdown menus with subroutes.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 *
 * @param navigation - Array of navigation menu items
 * @param className - Additional CSS classes
 * @returns Rendered navigation component
 */
const DropdownNavigation: ComponentType<DropdownNavigationProps> = ({
  navigation,
  className,
}) => {
  return (
    <Stack
      role="navigation"
      direction="row"
      align="center"
      className={className}
      style={{ gap: 'var(--gap-sm)' }}
    >
      {navigation.map((item, idx) =>
        item.routes && item.routes.length > 0 ? (
          <DropdownMenu
            key={item.label + idx}
            trigger={<Button icon={item.icon}>{item.label}</Button>}
            items={item.routes.map((route): DropdownMenuItemData => {
              // NavigationItemComponent already renders a Link/anchor — use it directly.
              // External links are handled via the route.external flag inside NavigationItemComponent.
              return {
                label: route.label,
                children: <NavigationItemComponent route={route} />,
                asChild: !!route.path,
              };
            })}
            contentAlign="start"
          />
        ) : item.path ? (
          <Button
            key={item.label + idx}
            icon={item.icon}
            aria-label={item.label}
            render={({ children, ...props }) => (
              <Link path={item.path!} {...props}>
                {children}
              </Link>
            )}
          >
            {item.label}
          </Button>
        ) : (
          <Button
            key={item.label + idx}
            icon={item.icon}
            disabled
            aria-label={item.label}
          >
            {item.label}
          </Button>
        )
      )}
    </Stack>
  );
};

export default DropdownNavigation;
