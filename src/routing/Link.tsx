'use client';
// packages/ui/src/routing/Link.tsx

/**
 * @fileoverview Link component
 * @description Platform-agnostic link component for navigation
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Link as LinkIcon } from 'lucide-react';
import type {
  ReactNode,
  ComponentType,
  MouseEvent,
  AnchorHTMLAttributes,
} from 'react';

import { useConsent } from '@donotdev/core';
// Platform-specific internal link via conditional exports (next/link on Next, react-router on Vite)
import { InternalLink } from '@donotdev/ui/routing/link';

import { Icon } from '../components/common/icon';
import { useCookieNoticeRequired } from '../components/cookie-consent/useCookieNoticeRequired';

/**
 * Link component props interface
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  path: string;
  replace?: boolean;
  /**
   * Next.js: internal links render next/link, prefetched with its default behaviour for
   * guests and in full for signed-in visitors (their pages render per request, which the
   * default skips); `false` disables prefetching. Vite: no effect.
   * @default true
   */
  prefetch?: boolean;
  children?: ReactNode;
  /** Icon component or string name */
  icon?: string | ReactNode;
  /** Place icon after content instead of before */
  iconEnd?: boolean;
  /** Label text (rendered as span if provided) */
  label?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/**
 * Link component. Internal paths are app paths (`/produits`): the rendered `href` and
 * the navigation use the current language's URL (`/en/produits` on an English page,
 * unchanged in the default language or a one-language app). Internal links render
 * next/link on Next.js (route prefetch, client-side navigation) and an `<a href>`
 * navigated by react-router on Vite; both output a real `<a href>`.
 *
 * @version 0.3.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const Link: ComponentType<LinkProps> = ({
  path,
  replace,
  prefetch = true,
  children,
  icon,
  iconEnd = false,
  label,
  onClick,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  target,
  rel,
  ...rest
}) => {
  const showCookieBanner = useConsent('showCookieBanner');
  const cookieNoticeRequired = useCookieNoticeRequired();

  // Special framework trigger: #cookie-settings
  if (path === '#cookie-settings') {
    // Only strictly necessary cookies: nothing to configure, so no (dead) control
    if (!cookieNoticeRequired) return null;
    const handleCookieSettings = (e: MouseEvent<HTMLAnchorElement>) => {
      // Honor browser native open-in-new-tab on modifier+click or non-left-click.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        if (onClick) onClick(e);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      try {
        showCookieBanner();
      } catch (error) {
        console.error('Failed to show cookie banner:', error);
      }
      if (onClick) {
        onClick(e);
      }
    };

    return (
      <a
        href="#cookie-settings"
        onClick={handleCookieSettings}
        className={className}
        style={{
          display: icon && (label || children) ? 'flex' : undefined,
          alignItems: icon && (label || children) ? 'center' : undefined,
          gap: icon && (label || children) ? 'var(--gap-sm)' : undefined,
          ...rest.style,
        }}
        aria-label={ariaLabel || label || 'Cookie Settings'}
        aria-describedby={ariaDescribedBy}
        {...rest}
      >
        {icon && !iconEnd && <Icon icon={icon} fallback={LinkIcon} />}
        {label && <span>{label}</span>}
        {children}
        {icon && iconEnd && <Icon icon={icon} fallback={LinkIcon} />}
      </a>
    );
  }

  // Auto-detect external URLs
  const isExternal =
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('mailto:') ||
    path.startsWith('tel:');

  const accessibilityProps = {
    'aria-label': ariaLabel || label,
    'aria-describedby': ariaDescribedBy,
  };

  const linkContent = (
    <>
      {icon && !iconEnd && <Icon icon={icon} fallback={LinkIcon} />}
      {label && <span>{label}</span>}
      {children}
      {icon && iconEnd && <Icon icon={icon} fallback={LinkIcon} />}
    </>
  );

  // External links: use regular <a> with target/rel
  if (isExternal) {
    return (
      <a
        href={path}
        onClick={onClick}
        target={target || '_blank'}
        rel={rel || 'noopener noreferrer'}
        className={className}
        style={{
          display: icon && (label || children) ? 'flex' : undefined,
          alignItems: icon && (label || children) ? 'center' : undefined,
          gap: icon && (label || children) ? 'var(--gap-sm)' : undefined,
        }}
        {...accessibilityProps}
        {...rest}
      >
        {linkContent}
      </a>
    );
  }

  // Internal links: the URL in the current language (`/en/…`), same as navigate()
  return (
    <InternalLink
      path={path}
      replace={replace}
      prefetch={prefetch}
      onClick={onClick}
      className={className}
      style={{
        display: icon && (label || children) ? 'flex' : undefined,
        alignItems: icon && (label || children) ? 'center' : undefined,
        gap: icon && (label || children) ? 'var(--gap-sm)' : undefined,
      }}
      {...accessibilityProps}
      {...rest}
    >
      {linkContent}
    </InternalLink>
  );
};
