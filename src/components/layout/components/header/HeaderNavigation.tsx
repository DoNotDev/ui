// packages/ui/src/components/layout/components/header/HeaderNavigation.tsx

/**
 * @fileoverview HeaderNavigation Component
 * @description Framework-compliant adaptive navigation with progressive disclosure
 *
 * Features:
 * - Uses framework NavigationMenu components
 * - Progressive disclosure: shows items inline, hides overflow in dropdown
 * - Uses IntersectionObserver to detect overflow
 * - "More" dropdown only shows when items overflow
 * - Theme-based styling only (no custom CSS)
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { MoreHorizontal } from 'lucide-react';
import { Link as LinkIcon } from 'lucide-react';

import {
  DISPLAY,
  DropdownMenu,
  Button,
  type DropdownMenuItemData,
} from '@donotdev/components';
import { cn } from '@donotdev/components';
import { useBreakpoint, useTranslation } from '@donotdev/core';

import { DnDevNavigationMenu } from '../../../../routing/DnDevNavigationMenu';
import { Link } from '../../../../routing/Link';
import { NavigationItemComponent } from '../../../../routing/NavigationItem';
import {
  useNavigationItems,
  useNavigationRoute,
} from '../../../../routing/useNavigation';
import { Icon } from '../../../common/icon';

import type { ComponentType } from 'react';

/** Props for the HeaderNavigation component. */
export interface HeaderNavigationProps {
  /** Custom className */
  className?: string;
  /** Whether to show icons */
  showIcons?: boolean;
  /**
   * Display mode - controls navigation layout strategy
   * - 'compact': All items in dropdown menu (compact space usage)
   * - 'full': Inline navigation with overflow detection (full space usage)
   * - 'auto': Responsive (dropdown on mobile/tablet, inline on desktop)
   * @default 'auto'
   */
  display?: (typeof DISPLAY)[keyof typeof DISPLAY];
  /**
   * Single-item mode: render one route as a standalone Button.
   * Resolves label, icon, and active state from the navigation store.
   * Renders null if the path is not found or inaccessible.
   */
  path?: string;
}

/**
 * HeaderNavigation - DISPLAY-aware adaptive navigation component
 *
 * Uses DISPLAY prop to choose navigation strategy:
 * - COMPACT: All items in dropdown menu (HeaderMenu pattern)
 * - FULL: Inline navigation with overflow detection (DnDevNavigationMenu with overflowDetection)
 * - AUTO: Responsive (dropdown on mobile/tablet, inline on desktop)
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const HeaderNavigation: ComponentType<HeaderNavigationProps> = ({
  className = '',
  showIcons = true,
  display = DISPLAY.AUTO,
  path,
}) => {
  const { t } = useTranslation('dndev');
  const isMobile = useBreakpoint('isMobile');
  const isTablet = useBreakpoint('isTablet');
  const navigationItems = useNavigationItems();
  const singleRoute = useNavigationRoute(path ?? '');

  // Single-item mode — render one route as a Button link.
  if (path) {
    if (!singleRoute) return null;
    return (
      <Button
        variant="ghost"
        display={display}
        icon={
          showIcons ? (
            <Icon icon={singleRoute.icon} fallback={LinkIcon} />
          ) : undefined
        }
        className={className}
        render={({ children, ...props }) => (
          <Link path={singleRoute.path} {...props}>
            {children}
          </Link>
        )}
      >
        {singleRoute.label}
      </Button>
    );
  }

  const effectiveDisplay =
    display === DISPLAY.AUTO
      ? isMobile || isTablet
        ? DISPLAY.COMPACT
        : DISPLAY.FULL
      : display;

  if (effectiveDisplay === DISPLAY.COMPACT) {
    return (
      <DropdownMenu
        trigger={
          <Button
            variant="ghost"
            icon={MoreHorizontal}
            aria-label={t('navigation.menu', 'Navigation')}
            className={className}
          />
        }
        contentAlign="end"
        items={navigationItems.map(
          (item): DropdownMenuItemData => ({
            label: item.label,
            children: (
              <NavigationItemComponent route={item} showIcons={showIcons} />
            ),
            asChild: true,
          })
        )}
      />
    );
  }

  return (
    <DnDevNavigationMenu
      overflowDetection
      showIcons={showIcons}
      className={cn(className)}
      style={{ flex: 1 }}
    />
  );
};

export default HeaderNavigation;
