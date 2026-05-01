// packages/ui/src/routing/DnDevNavigationMenu.tsx

/**
 * @fileoverview DnDevNavigationMenu - Universal navigation menu component
 * @description Smart navigation menu with auth-reactive route discovery and framework conventions
 *
 * Features:
 * - Auto-fetches routes if not provided (smart default, auth-reactive)
 * - Icon resolution (Lucide components → ReactNode with LinkIcon fallback)
 * - Routing-aware Link component injection
 * - 48px buttons/icons when vertical (sidebar standard)
 * - Optional overflow detection with "More" dropdown (for headers)
 * - Works for sidebars, headers, dropdowns, anywhere navigation is needed
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { MoreHorizontal, Link as LinkIcon } from 'lucide-react';
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type ComponentType,
} from 'react';

import {
  NavigationMenu,
  NavigationMenuListPrimitive,
  NavigationMenuItemPrimitive,
  Button,
  DropdownMenu,
  cn,
  DISPLAY,
} from '@donotdev/components';
import type {
  NavigationMenuItem,
  DropdownMenuItemData,
} from '@donotdev/components';
import { useTranslation } from '@donotdev/core';

import { Link } from './Link';
import { useNavigationItems } from './useNavigation';
import { Icon } from '../components/common/icon';

import type { NavigationItem } from './useNavigation';

/** Props for the DnDevNavigationMenu component. */
export interface DnDevNavigationMenuProps {
  /** Routes to display (optional - auto-fetches if not provided) */
  routes?: NavigationItem[];
  /** Vertical orientation (for sidebars) - defaults to horizontal */
  vertical?: boolean;
  /** Display mode - COMPACT (icon-only), FULL (icon+label), AUTO (CSS-driven) */
  display?: (typeof DISPLAY)[keyof typeof DISPLAY];
  /** Enable overflow detection with "More" dropdown (for headers) */
  overflowDetection?: boolean;
  /** Whether to show icons */
  showIcons?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * DnDevNavigationMenu - Universal navigation menu component
 *
 * Smart navigation menu with defaults:
 * - Auto-fetches routes if not provided (smart default, auth-reactive)
 * - Resolves icons (always shows icons with LinkIcon fallback)
 * - Injects routing-aware Link component
 * - 48px buttons/icons when vertical (sidebar standard)
 * - Optional overflow detection with "More" dropdown (for headers)
 *
 * Works for sidebars, headers, dropdowns, anywhere navigation is needed.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 *
 * @example
 * ```tsx
 * // Sidebar - auto-fetches routes (smart default, CSS-driven collapse)
 * <DnDevNavigationMenu vertical display={DISPLAY.AUTO} />
 *
 * // Header with overflow detection
 * <DnDevNavigationMenu overflowDetection showIcons={false} />
 *
 * // Custom routes
 * <DnDevNavigationMenu routes={customRoutes} vertical />
 * ```
 */
export const DnDevNavigationMenu: ComponentType<DnDevNavigationMenuProps> = ({
  routes,
  vertical = false,
  display = DISPLAY.AUTO,
  overflowDetection = false,
  showIcons = true,
  className,
  style,
}) => {
  const { t } = useTranslation('dndev');
  const autoRoutes = useNavigationItems();
  const finalRoutes = routes ?? autoRoutes;
  const containerRef = useRef<HTMLUListElement>(null);
  const [visibleCount, setVisibleCount] = useState(finalRoutes.length);

  const items: NavigationMenuItem[] = useMemo(
    () =>
      finalRoutes.map((route) => ({
        label: route.label,
        path: route.path,
        icon: <Icon icon={route.icon} fallback={LinkIcon} />,
        children: route.children
          ? route.children.map((child) => ({
              label: child.label,
              path: child.path,
              icon: <Icon icon={child.icon} fallback={LinkIcon} />,
            }))
          : undefined,
      })),
    [finalRoutes]
  );

  useEffect(() => {
    if (!overflowDetection || finalRoutes.length === 0 || vertical) return;

    const checkOverflow = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const items = container.querySelectorAll<HTMLElement>('[data-nav-item]');
      const moreButton =
        container.querySelector<HTMLElement>('[data-more-button]');

      let visible = 0;
      const moreButtonWidth = moreButton?.offsetWidth || 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) break;

        const itemRect = item.getBoundingClientRect();
        const itemRight = itemRect.right - containerRect.left;
        const totalWidth =
          itemRight +
          (i === items.length - 1 && moreButton ? moreButtonWidth : 0);

        if (totalWidth <= containerRect.width) {
          visible = i + 1;
        } else {
          break;
        }
      }

      setVisibleCount(Math.max(0, visible));
    };

    const resizeObserver = new ResizeObserver(checkOverflow);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    setTimeout(checkOverflow, 0);

    return () => resizeObserver.disconnect();
  }, [overflowDetection, finalRoutes.length, vertical]);

  useEffect(() => {
    if (overflowDetection && !vertical) {
      setVisibleCount(finalRoutes.length);
    }
  }, [finalRoutes.length, overflowDetection, vertical]);

  if (finalRoutes.length === 0) {
    return null;
  }

  if (overflowDetection && !vertical) {
    const boundedVisibleCount = Math.min(visibleCount, items.length);
    const visibleItems = items.slice(0, boundedVisibleCount);
    const overflowItems = items.slice(boundedVisibleCount);

    return (
      <NavigationMenu className={cn(className)} style={style || { flex: 1 }}>
        <NavigationMenuListPrimitive
          ref={containerRef}
          data-vertical="false"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--gap-sm)',
            flexWrap: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {visibleItems
            .filter((item) => item.path)
            .map((item, index) => (
              <NavigationMenuItemPrimitive
                key={item.path || index}
                data-nav-item
              >
                <Link
                  path={item.path!}
                  className={cn('dndev-interactive')}
                  data-role="nav-trigger"
                >
                  {showIcons && item.icon}
                  <span className="dndev-interactive-label">{item.label}</span>
                </Link>
              </NavigationMenuItemPrimitive>
            ))}

          {overflowItems.length > 0 && (
            <NavigationMenuItemPrimitive data-more-button>
              <DropdownMenu
                trigger={
                  <Button
                    className="dndev-size-touch"
                    style={{ flexShrink: 0 }}
                    aria-label={t('navigation.more', 'More')}
                  >
                    <MoreHorizontal className="dndev-size-md" />
                  </Button>
                }
                items={overflowItems
                  .filter((item) => item.path)
                  .map(
                    (item): DropdownMenuItemData => ({
                      label: item.label,
                      children: (
                        <Link
                          path={item.path!}
                          className={cn('dndev-interactive')}
                          data-role="menu-item"
                        >
                          {showIcons && item.icon}
                          <span className="dndev-interactive-label">
                            {item.label}
                          </span>
                        </Link>
                      ),
                      asChild: true,
                    })
                  )}
                contentWidth="14rem"
                contentAlign="end"
              />
            </NavigationMenuItemPrimitive>
          )}
        </NavigationMenuListPrimitive>
      </NavigationMenu>
    );
  }

  return (
    <NavigationMenu
      items={items}
      vertical={vertical}
      display={display}
      className={cn(className, vertical && 'dndev-sidebar-nav-menu')}
      LinkComponent={Link}
    />
  );
};

export default DnDevNavigationMenu;
