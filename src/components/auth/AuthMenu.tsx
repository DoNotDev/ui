'use client';
// packages/ui/src/components/auth/AuthMenu.tsx

/**
 * @fileoverview AuthMenu component for authenticated user menu
 * @description Config-driven authentication menu component that reads from appConfig.auth.
 * Provides user profile display, menu items from config, and mandatory GDPR/UX actions (Sign Out, Delete Account).
 *
 * **Key Features:**
 * - Config-driven: Reads profilePath and authMenuItems from appConfig.auth
 * - Self-aware: Automatically detects authentication status via useAuthVisibility()
 * - User profile header: Avatar, name, email, role, email verification status
 * - Dynamic menu: Profile (if configured) → authMenuItems → customItems → Delete → Sign Out
 * - Custom menu items: Support for paths (auto-Link) or onClick handlers with icons
 * - DISPLAY variants: COMPACT (icon-only), FULL (with label), AUTO (responsive)
 * - Account deletion: Full flow with reauthentication and confirmation dialogs
 * - Graceful degradation: Works without @donotdev/auth package installed
 *
 * **Menu Item Order:**
 * 1. Profile (if appConfig.auth.profilePath configured)
 * 2. Items from appConfig.auth.authMenuItems
 * 3. Custom items from customItems prop
 * 4. Delete Account (always shown - mandatory GDPR/UX)
 * 5. Sign Out (always shown - mandatory GDPR/UX)
 *
 * **Configuration:**
 * Configure menu items in appConfig.auth (route-based only):
 * ```typescript
 * const APP_CONFIG = {
 *   auth: {
 *     profilePath: '/profile',
 *     authMenuItems: [
 *       { path: '/dashboard' }, // icon auto-resolved from route
 *       { path: '/settings', label: 'Settings' }, // override label, icon from route
 *       { path: '/billing', icon: 'CreditCard' } // override icon
 *     ]
 *   }
 * };
 * ```
 *
 * **Custom Menu Items:**
 * Add custom items via props for runtime handlers:
 * ```typescript
 * <AuthMenu
 *   customItems={[
 *     { label: 'Billing', icon: CreditCard, onClick: () => navigate('/billing') },
 *     { path: '/settings', label: 'Settings', icon: 'Settings' }
 *   ]}
 * />
 * ```
 *
 * **Icons:**
 * Icons can be Lucide icon name strings (e.g., 'Settings', 'CreditCard') or React components.
 * String names are resolved dynamically from lucide-react.
 *
 * **Authentication States:**
 * - Authenticated: Shows UserCheck icon → dropdown with profile header + menu items
 * - Unauthenticated: Shows sign-in button (if loginPath) or AuthPartnerButton
 * - Loading: Shows loading state during auth operations
 * - Hidden: Returns null if shouldHide or !isReady
 *
 * **Accessibility:**
 * - Proper ARIA labels and roles
 * - Keyboard navigation support
 * - Screen reader friendly
 * - Focus management
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { User, LogOut, Settings, UserCheck, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import React, { useMemo, lazy, Suspense } from 'react';

import {
  Avatar,
  Button,
  BUTTON_VARIANT,
  DropdownMenu,
  Text,
  DISPLAY,
} from '@donotdev/components';
import type { DropdownMenuItemData } from '@donotdev/components';
import { useTranslation } from '@donotdev/core';
import {
  getEnabledAuthPartners,
  useAuthConfig,
  isClient,
} from '@donotdev/core';
import { useBreakpoint } from '@donotdev/core';
import { useNavigate } from '@donotdev/ui/routing/hooks';

import { useNavigationItems } from '../../routing';
import { useAuthSafe, useAuthVisibility } from '../../utils';

import type { CSSProperties } from 'react';
import type { ComponentType } from 'react';

const NullComponent = () => null;

// @ts-expect-error - lazy() type doesn't account for graceful degradation fallback
const ReauthDialog = lazy(async () => {
  try {
    const module = await import('@donotdev/auth');
    return { default: module.ReauthDialog };
  } catch {
    return { default: NullComponent as ComponentType<any> };
  }
});

// @ts-expect-error - lazy() type doesn't account for graceful degradation fallback
const ConfirmDeleteDialog = lazy(async () => {
  try {
    const module = await import('@donotdev/auth');
    return { default: module.ConfirmDeleteDialog };
  } catch {
    return { default: NullComponent as ComponentType<any> };
  }
});

// Graceful degradation for useDeleteAccount hook
// Resolved at module level (not render level) to avoid Rules of Hooks violation.
// Once set, useDeleteAccount never changes identity during the app lifecycle.
let useDeleteAccount: () => ReturnType<
  typeof import('@donotdev/auth').useDeleteAccount
> = () => {
  // Fallback: always call useState to maintain stable hook order
  const [showConfirmDialog] = React.useState(false);
  const [showPasswordDialog] = React.useState(false);
  const [isDeleting] = React.useState(false);
  const [error] = React.useState<string | null>(null);

  return {
    showConfirmDialog,
    showPasswordDialog,
    isDeleting,
    error,
    startDeleteFlow: () => {},
    confirmDelete: async () => {},
    cancel: () => {},
  };
};

// Preload useDeleteAccount (non-blocking)
// The hook reference is swapped before the first render in practice,
// but if the import resolves after first render, the fallback remains
// stable for that session to avoid hook order changes mid-lifecycle.
if (isClient()) {
  import('@donotdev/auth')
    .then((module) => {
      useDeleteAccount = module.useDeleteAccount;
    })
    .catch((e) => {
      if (process.env.NODE_ENV === 'development')
        console.warn('Failed to load @donotdev/auth:', e);
    });
}

/**
 * Custom menu item for AuthMenu
 *
 * Allows consumers to add custom menu items with icons and onClick handlers.
 * Icons can be Lucide icon names (string) or React components.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface AuthMenuCustomItem {
  /** Menu item label */
  label: string;
  /** Lucide icon name (string) or React component */
  icon?: string | ComponentType<{ className?: string }>;
  /** Click handler (required for custom items without path) */
  onClick?: () => void;
  /** Path for route-based items (creates Link automatically) */
  path?: string;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Custom style */
  style?: React.CSSProperties;
}

/**
 * Props for the AuthMenu component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface AuthMenuProps {
  /** Path for login (unauthenticated users). Falls back to appConfig.auth.loginPath */
  loginPath?: string;

  /**
   * Display - controls auth menu presentation in preset layouts
   * - 'compact': Icon-only button
   * - 'full': Button with label
   * - 'auto': Responsive (default)
   * @default 'auto'
   */
  display?: (typeof DISPLAY)[keyof typeof DISPLAY];

  /** Disable tooltip */
  'no-tooltip'?: boolean;

  /**
   * Custom menu items to add to authenticated menu.
   * Merged with items from appConfig.auth.authMenuItems.
   * Order: Profile (if configured) → authMenuItems → customItems → Delete Account → Sign Out
   */
  customItems?: AuthMenuCustomItem[];

  /** Optional className for styling the button */
  className?: string;
  /** Optional inline styles for the button */
  style?: CSSProperties;
}

/**
 * Resolves Lucide icon component from string name or component reference
 *
 * Supports:
 * - String names (e.g., 'Settings', 'CreditCard') - resolved dynamically from lucide-react
 * - React component references - returned as-is
 * - Undefined/null - returns Settings as fallback
 *
 * @param iconName - Lucide icon name string, React component, or undefined
 * @returns Lucide icon component (or Settings fallback)
 */
const getIcon = (
  iconName: string | ComponentType<{ className?: string }> | undefined
): ComponentType<{ className?: string }> => {
  if (!iconName) return Settings;
  if (typeof iconName === 'function') return iconName;
  const cleanIconName = iconName.replace(/['"]/g, '');
  const resolved = (LucideIcons as any)[cleanIconName];
  if (!resolved && process.env.NODE_ENV === 'development') {
    console.warn(
      `[AuthMenu] Icon name "${cleanIconName}" not found in Lucide icons, falling back to Settings.`
    );
  }
  return resolved || Settings;
};

export const AuthMenu = ({
  loginPath,
  display = DISPLAY.AUTO,
  'no-tooltip': noTooltip = false,
  customItems = [],
  className,
  style,
}: AuthMenuProps) => {
  const { t } = useTranslation('dndev');
  const { shouldHide, isReady, isAuthenticated } = useAuthVisibility();
  const authConfig = useAuthConfig();
  // Get real auth state from the store (self-aware)
  const user = useAuthSafe('user');
  const signOut = useAuthSafe('signOut');
  const isLaptop = useBreakpoint('isLaptop');
  const navigationItems = useNavigationItems();
  const navigate = useNavigate();

  const profilePath = authConfig.profilePath;
  const configMenuItems = authConfig.authMenuItems || [];

  // Extract role from user (declared early so getUserTooltip can reference it)
  const role = user?.role;

  // Account deletion flow - managed by useDeleteAccount hook
  const deletion = useDeleteAccount();

  /**
   * Get user display name with fallbacks
   */
  const getUserDisplayName = (): string => {
    if (!user) return 'User';
    return user.displayName || user.email?.split('@')[0] || 'User';
  };

  /**
   * Get user avatar initials
   */
  const getUserInitials = (): string => {
    const name = getUserDisplayName();
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  /**
   * Get user tooltip text with account info (desktop only)
   */
  const getUserTooltip = (): string => {
    if (!user) return t('auth.userMenu', { defaultValue: 'User menu' });
    const parts = [getUserDisplayName()];
    if (user.email) parts.push(user.email);
    if (role && role !== 'guest') parts.push(`Role: ${role}`);
    return parts.join('\n');
  };

  /**
   * Build menu items list: Profile → configMenuItems → customItems → Delete → SignOut
   */
  const menuItems: DropdownMenuItemData[] = useMemo(() => {
    const items: DropdownMenuItemData[] = [];

    // Mobile: Add disabled info item as first entry
    if (!isLaptop && user) {
      items.push({
        // Use Text component as children instead of label
        children: (
          <Text variant="muted" as="span">
            {`${getUserDisplayName()}${user.email ? `\n${user.email}` : ''}`}
          </Text>
        ),
        disabled: true,
      });
    }

    // Profile (if configured in appConfig.auth)
    if (profilePath) {
      items.push({
        label: t('auth.profile', { defaultValue: 'Profile' }),
        icon: User,
        onClick: () => navigate(profilePath),
      });
    }

    // Config menu items (if configured in appConfig.auth.authMenuItems)
    // Icons are auto-resolved from route discovery if not provided
    configMenuItems.forEach((item) => {
      const navItem = navigationItems.find((nav) => nav.path === item.path);
      const label =
        item.label || navItem?.label || item.path.split('/').pop() || 'Menu';
      // Use route discovery icon if item.icon not provided, otherwise use item.icon
      const Icon = item.icon
        ? getIcon(item.icon)
        : navItem?.icon &&
            (typeof navItem.icon === 'string' ||
              typeof navItem.icon === 'function')
          ? getIcon(
              navItem.icon as string | ComponentType<{ className?: string }>
            )
          : Settings;
      items.push({
        label,
        icon: Icon,
        onClick: () => navigate(item.path),
      });
    });

    // Custom items from props (merged with config items)
    customItems.forEach((item) => {
      if (item.path) {
        // Route-based item
        const navItem = navigationItems.find((nav) => nav.path === item.path);
        const label =
          item.label || navItem?.label || item.path.split('/').pop() || 'Menu';
        const Icon = item.icon ? getIcon(item.icon) : Settings;
        items.push({
          label,
          icon: Icon,
          onClick: () => navigate(item.path!),
          disabled: item.disabled,
          style: item.style,
        });
      } else if (item.onClick) {
        // Custom item with onClick
        const Icon = item.icon ? getIcon(item.icon) : Settings;
        items.push({
          label: item.label,
          icon: Icon,
          onClick: item.onClick,
          disabled: item.disabled,
          style: item.style,
        });
      }
    });

    // Delete Account (always show - mandatory GDPR/UX)
    items.push({
      label: t('auth.deleteAccount.label', { defaultValue: 'Delete Account' }),
      icon: Trash2,
      onClick: deletion.startDeleteFlow,
      variant: 'destructive',
    });

    // Sign out (always show - mandatory GDPR/UX)
    items.push({
      label: t('auth.signOut', { defaultValue: 'Sign Out' }),
      icon: LogOut,
      onClick: () => signOut(),
      variant: 'destructive',
    });

    return items;
  }, [
    profilePath,
    configMenuItems,
    customItems,
    signOut,
    deletion,
    t,
    navigationItems,
    isLaptop,
    user,
    role,
    getUserDisplayName,
    navigate,
  ]);

  // Get enabled providers
  const enabled = getEnabledAuthPartners();

  // If no providers enabled or should hide or not ready, render nothing
  if (enabled.length === 0 || shouldHide || !isReady) {
    return null;
  }

  // Return null when unauthenticated - AuthHeader handles unauthenticated state
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Account Deletion Dialogs */}
      <Suspense fallback={null}>
        <ReauthDialog
          open={deletion.showPasswordDialog}
          isLoading={deletion.isDeleting}
          error={deletion.error}
          onReauth={(password) => deletion.confirmDelete(password)}
          onCancel={deletion.cancel}
        />
      </Suspense>
      <Suspense fallback={null}>
        <ConfirmDeleteDialog
          open={deletion.showConfirmDialog}
          isLoading={deletion.isDeleting}
          error={deletion.error}
          onConfirm={() => deletion.confirmDelete()}
          onCancel={deletion.cancel}
        />
      </Suspense>

      {/* User Menu Dropdown */}
      <DropdownMenu
        trigger={
          <Button
            variant={BUTTON_VARIANT.OUTLINE}
            icon={
              user ? (
                <Avatar
                  src={user.photoURL ?? undefined}
                  fallback={getUserInitials()}
                  alt={getUserDisplayName()}
                  style={{ margin: '-4px 0' }}
                />
              ) : (
                UserCheck
              )
            }
            display={display}
            aria-label={t('auth.userMenu', { defaultValue: 'User menu' })}
            tooltip={
              !noTooltip && isLaptop && user
                ? getUserTooltip()
                : !noTooltip
                  ? t('auth.userMenu', { defaultValue: 'User menu' })
                  : undefined
            }
            className={className}
            style={style}
          >
            {getUserDisplayName()}
          </Button>
        }
        items={menuItems}
        contentAlign="end"
      />
    </>
  );
};

export default AuthMenu;
