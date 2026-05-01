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
import {
  type ReactNode,
  type ComponentType,
  type MouseEvent,
  type AnchorHTMLAttributes,
} from 'react';

import { cn } from '@donotdev/components';
import { useConsent } from '@donotdev/core';
// Platform-specific hooks via conditional exports
import { useNavigate } from '@donotdev/ui/routing/hooks';

import { Icon } from '../components/common/icon';

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
 * Link component
 *
 * @version 0.1.0
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
  const navigate = useNavigate();
  const showCookieBanner = useConsent('showCookieBanner');

  // Special framework trigger: #cookie-settings
  if (path === '#cookie-settings') {
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

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // External links: let browser handle naturally
    if (isExternal) {
      if (onClick) {
        onClick(e);
      }
      return; // Don't prevent default for external links
    }

    // Honor browser native open-in-new-tab on modifier+click or non-left-click.
    // Without this, preventDefault() below would block the browser default,
    // and Ctrl/Cmd-click would silently navigate in the same tab.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      if (onClick) onClick(e);
      return; // browser handles new tab / new window
    }

    // Internal links: use framework navigation
    e.preventDefault();

    if (onClick) {
      onClick(e);
    }

    // Ensure path is absolute (starts with /) to prevent relative navigation issues
    // but preserve intentional relative paths (starting with '.' or '..')
    const absolutePath =
      path.startsWith('/') || path.startsWith('.') ? path : `/${path}`;
    navigate(absolutePath, { replace });
  };

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
        onClick={handleClick}
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

  // Internal links: use framework Link
  return (
    <a
      href={path}
      onClick={handleClick}
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
};
