'use client';
// packages/ui/src/components/layout/components/Breadcrumbs.tsx

/**
 * @fileoverview Breadcrumbs Component
 * @description Professional breadcrumb navigation with route discovery
 *
 * Features:
 * - Automatic trail: home, the page's ancestors (`routeAncestors` in `@donotdev/core`:
 *   URL prefixes that are routes, PageMeta `parent`), the page; each named by its route's
 *   title (`routeLabel`, the `<title>` chain), the shown record by its name
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
import {
  breadcrumbNamespaces,
  getRoutes,
  matchRoute,
  routeAncestors,
  routeLabel,
  useAppConfig,
  useLayout,
  useSeoConfig,
  useTranslation,
} from '@donotdev/core';
// Platform-specific hooks via conditional exports
import { useRoutePath } from '@donotdev/ui/routing/hooks';

import { shownRecordLabel } from '../../../crud/components/useRecordBreadcrumb';
import { Link } from '../../../routing/Link';
import { useIsNotFoundDocument } from '../../../routing/NotFoundDocument';

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
 * Automatically generates breadcrumbs from current route or accepts custom items.
 * Generated trail: home, the page's ancestors (`routeAncestors`, the chain of the
 * BreadcrumbList JSON-LD and the forms' parent path), linked, then the page, each named by
 * its route's title (`routeLabel`: `seo.title`, else `<namespace>:title`, as its
 * `<title>`); the page reads as the shown record's name (`useRecordBreadcrumb`) when its
 * last URL segment names it. A URL prefix that is no route is no crumb. Routes are the
 * build's route manifest (not auth-filtered): the server render and the browser build the
 * same trail. Renders no generated trail inside a NotFoundDocument (the 404, served for
 * any URL).
 */
const Breadcrumbs: ComponentType<BreadcrumbsProps> = ({
  items,
  separator: Separator = ChevronRight,
  showHome = true,
  homeHref = '/',
  variant = 'default',
  className,
}) => {
  const pathname = useRoutePath();
  const routes = getRoutes();
  // Crumb labels read their routes' namespaces (lazy page namespaces load here)
  const namespaces = useMemo(
    () => breadcrumbNamespaces(pathname, routes),
    [pathname, routes]
  );
  const { t } = useTranslation(['dndev', ...namespaces]);
  const seoConfig = useSeoConfig();
  const appMeta = useAppConfig('app');
  // Record shown by the page (useRecordBreadcrumb: EntityFormRenderer / EntityDisplayRenderer, app pages)
  const recordLabel = useLayout('routeRecordLabel');

  // The 404 document is served for any unknown URL (Next: rendered once at build, at
  // `/_not-found`): no trail derived from the URL, or server and browser differ (React #418)
  const notFoundDocument = useIsNotFoundDocument();
  if (notFoundDocument && !items) return null;

  // Auto-generate breadcrumbs from current path if not provided
  const breadcrumbItems: BreadcrumbItem[] = items
    ? items
    : (() => {
        // Labels: each route's title (the <title> chain), as the BreadcrumbList names it
        const site = {
          t,
          // As AutoMetaTags: appConfig.seo.defaultNamespace, site name (seo off: app name)
          defaultNs: (seoConfig && seoConfig.defaultNamespace) || 'home',
          siteName: (seoConfig && seoConfig.siteName) || appMeta?.name || '',
        };
        const breadcrumbs: BreadcrumbItem[] = routeAncestors(pathname, routes).map(
          (route) => ({ label: routeLabel(route, site), href: route.path })
        );
        const page = matchRoute(routes, pathname)?.route;
        // The last segment naming the shown record (slug or id) shows the record's name
        const label =
          shownRecordLabel(pathname, recordLabel) ??
          (page ? routeLabel(page, site) : undefined);
        if (label) breadcrumbs.push({ label });
        return breadcrumbs;
      })();

  // Add home item if enabled
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: t('navigation.home'), href: homeHref }, ...breadcrumbItems]
    : breadcrumbItems;

  // Smart variant: Hide breadcrumbs on simple pages (root or single segment)
  if (variant === 'smart') {
    const segments = pathname.split('/').filter(Boolean);
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
