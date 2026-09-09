// packages/ui/src/components/layout/components/Breadcrumbs.tsx

/**
 * @fileoverview Breadcrumbs Component
 * @description Professional breadcrumb navigation with route discovery
 *
 * Features:
 * - Automatic route discovery and breadcrumb generation
 * - Clickable navigation
 * - Professional styling with icons
 * - Responsive design
 * - Customizable separator
 * - Active state management
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import type { ComponentType } from 'react';

import { cn } from '@donotdev/components';
import { useTranslation } from '@donotdev/core';
// Platform-specific hooks via conditional exports
import { useLocation } from '@donotdev/ui/routing/hooks';

import { Link } from '../../../routing/Link';
import { useAllRoutes } from '../../../routing/useRouteDiscovery';

/** Single breadcrumb navigation item. */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ComponentType<{ className?: string }>;
}

/** Props for the Breadcrumbs component. */
export interface BreadcrumbsProps {
  /** Custom breadcrumb items - if not provided, will auto-generate from route */
  items?: BreadcrumbItem[];
  /** Custom separator component */
  separator?: ComponentType<{ className?: string }>;
  /** Show home icon for root */
  showHome?: boolean;
  /** Custom home href */
  homeHref?: string;
  /** Breadcrumb display variant */
  variant?: 'smart' | 'default';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Breadcrumbs component for navigation
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 *
 * Automatically generates breadcrumbs from current route or accepts custom items
 */
const Breadcrumbs: ComponentType<BreadcrumbsProps> = ({
  items,
  separator: Separator = ChevronRight,
  showHome = true,
  homeHref = '/',
  variant = 'default',
  className,
}) => {
  const { t } = useTranslation('dndev');
  const location = useLocation();
  const allRoutes = useAllRoutes();

  // Build set of valid route paths for existence checking
  const validRoutes = useMemo(() => {
    return new Set(allRoutes.map((route) => route.path));
  }, [allRoutes]);

  // Auto-generate breadcrumbs from current path if not provided
  const breadcrumbItems: BreadcrumbItem[] = items
    ? items
    : (() => {
        const pathSegments = location.pathname.split('/').filter(Boolean);
        const breadcrumbs: BreadcrumbItem[] = [];
        let currentPath = '';
        pathSegments.forEach((segment: string) => {
          currentPath += `/${segment}`;
          const label = segment
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          // Only add href if route actually exists
          const href = validRoutes.has(currentPath) ? currentPath : undefined;
          breadcrumbs.push({ label, href });
        });
        return breadcrumbs;
      })();

  // Add home item if enabled
  const allItems: BreadcrumbItem[] = showHome
    ? [
        { label: t('navigation.home', 'Home'), href: homeHref },
        ...breadcrumbItems,
      ]
    : breadcrumbItems;

  // Smart variant: Hide breadcrumbs on simple pages (root or single segment)
  if (variant === 'smart') {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      return null; // Don't render breadcrumbs on simple pages
    }
  }

  return (
    <nav
      role="navigation"
      aria-label="Breadcrumb navigation"
      className={cn('breadcrumbs', className)}
    >
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;
        const isActive = isLast || !item.href;

        return (
          <span key={index} className="breadcrumb-item">
            {index > 0 && <Separator className="dndev-size-md separator" />}
            {item.icon && <item.icon className="dndev-size-md icon" />}
            {item.href && !isActive ? (
              <Link path={item.href} className="breadcrumb-link">
                {item.label}
              </Link>
            ) : (
              <span className="breadcrumb-label">{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
