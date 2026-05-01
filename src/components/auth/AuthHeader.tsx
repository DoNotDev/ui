'use client';
// packages/ui/src/components/auth/AuthHeader.tsx

/**
 * @fileoverview Auth Header Component
 * @description Authentication header component for navigation. Provides user authentication status, login/logout buttons, and user menu with lazy-loaded authentication modal.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { User } from 'lucide-react';
import React, { Suspense, lazy, useState } from 'react';

import {
  Button,
  BUTTON_VARIANT,
  DropdownMenu,
  Dialog,
  DISPLAY,
} from '@donotdev/components';
import { useTranslation } from '@donotdev/core';
import { useAuthConfig } from '@donotdev/core';
import { getEnabledAuthPartners } from '@donotdev/core';
import type { AuthPartnerId } from '@donotdev/core';

import { AuthMenu } from './AuthMenu';
import { Link } from '../../routing';
import { useAuthSafe, useAuthVisibility } from '../../utils';

import type { CSSProperties } from 'react';
import type { ComponentType } from 'react';

// Lazy load auth components for code splitting; degrade to null if auth pkg missing
const NullComponent = () => null;

interface SignInButtonProps extends React.ComponentProps<typeof Button> {
  display: (typeof DISPLAY)[keyof typeof DISPLAY];
  variant?: (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];
  signInLabel: string;
  className?: string;
  style?: React.CSSProperties;
}

function SignInButton({
  display,
  variant = BUTTON_VARIANT.OUTLINE,
  signInLabel,
  className,
  style,
  children,
  ...props
}: SignInButtonProps) {
  return (
    <Button
      variant={variant}
      icon={User}
      display={display}
      tooltip={signInLabel}
      className={className}
      style={style}
      {...props}
    >
      {children ?? signInLabel}
    </Button>
  );
}

// @ts-expect-error - lazy() type doesn't account for graceful degradation fallback
const AuthPartnerButton = lazy(async () => {
  try {
    const module = await import('@donotdev/auth');
    return { default: module.AuthPartnerButton };
  } catch {
    return { default: NullComponent as ComponentType<any> };
  }
});

// @ts-expect-error - lazy() type doesn't account for graceful degradation fallback
const MultipleAuthProviders = lazy(async () => {
  try {
    const module = await import('@donotdev/auth');
    return { default: module.MultipleAuthProviders };
  } catch {
    return { default: NullComponent as ComponentType<any> };
  }
});

/**
 * AuthHeader - Simple, powerful authentication component for headers
 *
 * Automatically reads all configuration from `appConfig.auth` (DRY principle).
 * Accepts `display` prop for layout-specific UI control.
 *
 * Features:
 * - Lazy-loaded components for optimal performance
 * - Responsive design (icon on mobile/tablet, button with label on desktop)
 * - Industry standard patterns (dropdown for 2+ providers)
 * - Error handling via useAuth (no additional error states needed)
 * - 100% Lighthouse compatible
 * - Auto-configuration from appConfig (no props needed)
 *
 * @example
 * ```tsx
 * // Configure once in appConfig.auth
 * const APP_CONFIG = {
 * auth: {
 * loginPath: '/login', // Optional: links to login page
 * authMenuItems: [{ path: '/dashboard' }, { path: '/settings' }] // Optional: user menu routes
 * }
 * };
 *
 * // In presets - reads from appConfig automatically
 * // This component composes AuthPartnerButton and MultipleAuthProviders from @donotdev/auth.
 * // Use AuthHeader if you need a pre-built, responsive authentication component for your app's header.
 * <AuthHeader />
 *
 * // Force icon-only mode (e.g., for sidebars)
 * <AuthHeader display="compact" />
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface AuthHeaderProps {
  /**
   * Display - controls auth header presentation in preset layouts
   * - 'compact': Icon-only buttons
   * - 'full': Full buttons with labels
   * - 'auto': Responsive (default)
   * @default 'auto'
   */
  display?: (typeof DISPLAY)[keyof typeof DISPLAY];
  /**
   * Button variant for the sign-in trigger.
   * @default 'outline'
   */
  variant?: (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];
  /** Optional className for styling the button */
  className?: string;
  /** Optional inline styles for the button */
  style?: CSSProperties;
}

/**
 * Auth header component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const AuthHeader: ComponentType<AuthHeaderProps> = ({
  display = DISPLAY.AUTO,
  variant = BUTTON_VARIANT.OUTLINE,
  className,
  style,
}) => {
  const { t } = useTranslation('dndev');
  const { shouldHide, isLoading, isReady, isAuthenticated } =
    useAuthVisibility();
  const authConfig = useAuthConfig();
  const enabled = getEnabledAuthPartners();
  const [dialogOpen, setDialogOpen] = useState(false);

  const loginPath = authConfig.loginPath;
  const signInLabel = t('auth.signIn', { defaultValue: 'Sign In' });
  const loadingLabel = t('auth.loading', { defaultValue: 'Loading...' });

  const hasPasswordProvider =
    enabled.includes('password') || enabled.includes('emailLink');

  if (shouldHide || !isReady) {
    return null;
  }

  // NOT AUTHENTICATED
  // Button's display prop + CSS container queries handle responsive label visibility
  if (!isAuthenticated) {
    if (loginPath !== undefined) {
      return (
        <Link path={loginPath} prefetch>
          <SignInButton
            display={display}
            variant={variant}
            signInLabel={signInLabel}
            className={className}
            style={style}
          />
        </Link>
      );
    }

    const targetProvider = enabled[0] as AuthPartnerId;

    // Use Dialog if password/emailLink provider is present (better UX for forms)
    if (hasPasswordProvider) {
      return (
        <Dialog
          trigger={
            <SignInButton
              display={display}
              signInLabel={signInLabel}
              className={className}
              style={style}
            />
          }
          title={signInLabel}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          data-content-size="form"
        >
          <Suspense
            fallback={
              <div
                style={{
                  padding: 'var(--gap-md)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--muted-foreground)',
                }}
              >
                {loadingLabel}
              </div>
            }
          >
            <MultipleAuthProviders
              spacing="medium"
              onSuccess={() => setDialogOpen(false)}
            />
          </Suspense>
        </Dialog>
      );
    }

    // Use DropdownMenu if multiple OAuth providers (no password/emailLink)
    if (enabled.length > 1) {
      return (
        <DropdownMenu
          trigger={
            <SignInButton
              display={display}
              signInLabel={signInLabel}
              className={className}
              style={style}
            />
          }
        >
          <Suspense
            fallback={
              <div
                style={{
                  padding: 'var(--gap-md)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--muted-foreground)',
                }}
              >
                {loadingLabel}
              </div>
            }
          >
            <MultipleAuthProviders spacing="tight" />
          </Suspense>
        </DropdownMenu>
      );
    }

    // Normal case: single non-password provider → use AuthPartnerButton directly
    return (
      <Suspense
        fallback={
          <SignInButton
            display={display}
            signInLabel={signInLabel}
            className={className}
            style={style}
            disabled={isLoading}
            tooltip={isLoading ? loadingLabel : signInLabel}
          >
            {isLoading ? loadingLabel : signInLabel}
          </SignInButton>
        }
      >
        <AuthPartnerButton
          partnerId={targetProvider}
          display={display}
          className={className}
          style={style}
        />
      </Suspense>
    );
  }

  // AUTHENTICATED - Delegate to AuthMenu
  return (
    <AuthMenu
      display={display}
      loginPath={loginPath}
      className={className}
      style={style}
    />
  );
};

export default AuthHeader;
