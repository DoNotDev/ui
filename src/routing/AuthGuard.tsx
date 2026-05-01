'use client';
// packages/ui/src/routing/AuthGuard.tsx

/**
 * @fileoverview AuthGuard component
 * @description Cold-load safety net for protected routes. Redirects unauthenticated
 * users to authRoute. SPA navigation is intercepted earlier in useNavigate.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useEffect } from 'react';
import type { ReactNode, ComponentType } from 'react';

import { Spinner } from '@donotdev/components';
import {
  FEATURE_STATUS,
  USER_ROLES,
  SUBSCRIPTION_TIERS,
  isClient,
  safeSessionStorage,
} from '@donotdev/core';
import type { PageAuth } from '@donotdev/core';
// Platform-specific hooks via conditional exports
import { useRedirectGuard, useNavigate } from '@donotdev/ui/routing/hooks';

import { useAuthSafe } from '../utils/useAuthSafe';

/**
 * Props for AuthGuard component
 */
interface AuthGuardProps {
  /** Auth configuration for this route */
  auth: PageAuth | false;
  /** Children to render if auth passes */
  children: ReactNode;
  /** Fallback component while checking auth */
  fallback?: ComponentType;
}

/**
 * AuthGuard - cold-load redirect safety net
 *
 * For SPA navigation, auth is intercepted in useNavigate (before page mount).
 * This component handles the cold-load case: user pastes a protected URL directly.
 * It redirects to authRoute, saves returnTo, and AuthReturnTo handles the redirect back.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function AuthGuard({
  auth,
  children,
  fallback: Fallback = () => <Spinner overlay />,
}: AuthGuardProps) {
  const navigate = useNavigate();
  const user = useAuthSafe('user');
  const status = useAuthSafe('status');

  const { shouldRedirect, redirectTo, isChecking } = useRedirectGuard({
    auth,
  });

  // Redirect if needed - save current path when redirecting unauthenticated user
  useEffect(() => {
    if (shouldRedirect && redirectTo) {
      if (!user && isClient()) {
        safeSessionStorage.setItem(
          'dndev.auth.returnTo',
          window.location.pathname + window.location.search
        );
        safeSessionStorage.setItem('dndev.auth.guardToast', '1');
      }
      navigate(redirectTo, { replace: true });
    }
  }, [shouldRedirect, redirectTo, navigate, user]);

  // Return-to after OAuth is handled by AuthReturnTo (mounted in RootLayout).

  // Public route - no auth required
  if (auth === false) {
    return <>{children}</>;
  }

  // Show spinner while redirect will happen or auth is still checking
  if (shouldRedirect || isChecking) {
    return <Spinner overlay />;
  }

  // Still initializing auth - show fallback spinner
  if (status === FEATURE_STATUS.INITIALIZING) {
    return <Fallback />;
  }

  // All checks passed, render children
  return <>{children}</>;
}

/**
 * Hook to check if current user can navigate to a route with given auth config
 * ONLY uses store - single source of truth!
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function useCanNavigate(auth: PageAuth | false): boolean {
  const can = useAuthSafe('can');
  return can?.navigate(auth) ?? false;
}

/**
 * @deprecated Use useCanNavigate instead
 */
export const useCanAccess = useCanNavigate;

/**
 * Hook to get current user's role - directly from store
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function useUserRole():
  | typeof USER_ROLES.GUEST
  | typeof USER_ROLES.USER
  | typeof USER_ROLES.ADMIN {
  const user = useAuthSafe('user');
  const role = user?.role;
  return (
    (role as
      | typeof USER_ROLES.GUEST
      | typeof USER_ROLES.USER
      | typeof USER_ROLES.ADMIN) || USER_ROLES.GUEST
  );
}

/**
 * Hook to check specific role - directly from store
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function useHasRole(
  role:
    | typeof USER_ROLES.GUEST
    | typeof USER_ROLES.USER
    | typeof USER_ROLES.ADMIN
): boolean {
  const user = useAuthSafe('user');
  // Use cached role for display purposes
  return user?.role === role;
}

/**
 * Hook to get all auth state for debugging
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function useAuthState() {
  const user = useAuthSafe('user');
  const userSubscription = useAuthSafe('userSubscription');
  const loading = useAuthSafe('loading');
  return {
    authenticated: !!user,
    role: user?.role,
    tier: userSubscription?.tier || 'free',
    loading,
    userId: user?.id,
  };
}

/**
 * HOC to wrap components with auth protection
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function withAuth<P extends object>(
  Component: ComponentType<P>,
  auth: PageAuth | false
) {
  const WrappedComponent = (props: P) => (
    <AuthGuard auth={auth}>
      <Component {...props} />
    </AuthGuard>
  );

  return WrappedComponent;
}

/**
 * Utility to create auth configs
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const createAuthConfig = {
  /** No authentication required */
  public: (): false => false,

  /** Basic authentication required */
  required: (): PageAuth => ({ required: true }),

  /** User role (any authenticated user) */
  user: (): PageAuth => ({
    required: true,
    role: USER_ROLES.USER,
  }),

  /** Admin role (Firebase custom claim isAdmin: true) */
  admin: (): PageAuth => ({
    required: true,
    role: USER_ROLES.ADMIN,
  }),

  /** Tier-based authentication */
  tier: (
    tier: (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS]
  ): PageAuth => ({
    required: true,
    tier,
  }),

  /** Pro tier */
  pro: (): PageAuth => ({
    required: true,
    tier: SUBSCRIPTION_TIERS.PRO,
  }),

  /** Premium tier */
  premium: (): PageAuth => ({
    required: true,
    tier: SUBSCRIPTION_TIERS.PREMIUM,
  }),

  /** Admin with pro tier requirement */
  adminPro: (): PageAuth => ({
    required: true,
    role: USER_ROLES.ADMIN,
    tier: SUBSCRIPTION_TIERS.PRO,
  }),

  /** Custom validation */
  custom: (validate: (role: string, tier: string) => boolean): PageAuth => ({
    required: true,
    validate,
  }),
};

export default AuthGuard;
