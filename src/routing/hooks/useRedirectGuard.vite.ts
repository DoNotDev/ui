'use client';
// packages/ui/src/routing/hooks/useRedirectGuard.vite.ts

/**
 * @fileoverview Vite Redirect Guard Hook
 * @description Determines redirect state before render. Prevents content flash.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useMemo } from 'react';

import { isClient, FEATURE_STATUS } from '@donotdev/core';
import { useAuthConfig } from '@donotdev/core';
import type { PageAuth, FeatureStatus } from '@donotdev/core';

import { useLocation } from './useLocation.vite';
import { useAuthSafe } from '../../utils/useAuthSafe';

/** Configuration options for the redirect guard hook. */
export interface RedirectGuardOptions {
  /** Auth configuration for this route */
  auth?: PageAuth | false;
  /** Custom redirect target (overrides auth config defaults) */
  redirectTo?: string | null;
  /** Custom condition function to check if redirect should happen */
  condition?: (user: any, status: FeatureStatus) => boolean;
}

/** Return value of the useRedirectGuard hook. */
export interface RedirectGuardResult {
  /** Whether redirect should happen */
  shouldRedirect: boolean;
  /** Target path for redirect, or null if no redirect */
  redirectTo: string | null;
  /** Whether auth state is still being checked */
  isChecking: boolean;
}

/**
 * Hook that checks if redirect should happen before render
 *
 * Prevents content flash by determining redirect state synchronously.
 * Returns safe defaults on server (SSR-safe).
 *
 * @param options - Redirect guard configuration
 * @returns Redirect guard state
 */
export function useRedirectGuard(
  options: RedirectGuardOptions = {}
): RedirectGuardResult {
  const { auth, redirectTo: customRedirectTo, condition } = options;

  // Hooks must be called unconditionally (Rules of Hooks)
  const location = useLocation();
  const authConfig = useAuthConfig();
  const user = useAuthSafe('user');
  const can = useAuthSafe('can');
  const status = useAuthSafe('status');

  // Determine redirect state
  const redirectState = useMemo(() => {
    const noAction: RedirectGuardResult = {
      shouldRedirect: false,
      redirectTo: null,
      isChecking: false,
    };

    // SSR-safe: return safe defaults on server
    if (!isClient()) return noAction;

    // Only INITIALIZING = still checking. DEGRADED/ERROR/READY = auth resolved (proceed with current user)
    if (status === FEATURE_STATUS.INITIALIZING) {
      return { ...noAction, isChecking: true };
    }

    // Custom condition provided
    if (condition) {
      const shouldRedirect = condition(user, status);
      return {
        shouldRedirect,
        redirectTo: shouldRedirect ? customRedirectTo || null : null,
        isChecking: false,
      };
    }

    // Use auth config to determine redirect
    if (auth !== false && auth !== undefined) {
      if (!can) return noAction;

      // Check if user can navigate to this route
      if (!can.navigate(auth)) {
        let targetRoute: string | null = null;

        // Authentication failure (not logged in) → always redirect
        if (typeof auth === 'object' && auth.required && !user) {
          // Check if we have OAuth parameters that need to be preserved
          const hasOAuthParams =
            location.search.includes('code=') ||
            location.search.includes('state=') ||
            location.search.includes('error=');

          const authRoute = authConfig.authRoute!;
          if (hasOAuthParams) {
            targetRoute = `${authRoute}${location.search}`;
          } else {
            targetRoute = authRoute;
          }
        }
        // Authorization failure (wrong role)
        else if (typeof auth === 'object' && auth.role) {
          targetRoute = authConfig.roleRoute;
        }
        // Authorization failure (wrong tier)
        else if (typeof auth === 'object' && auth.tier) {
          targetRoute = authConfig.tierRoute;
        }
        // Fallback
        else {
          targetRoute = authConfig.roleRoute;
        }

        return {
          shouldRedirect: true,
          redirectTo: customRedirectTo || targetRoute,
          isChecking: false,
        };
      }
    }

    // No redirect needed
    return noAction;
  }, [
    auth,
    status,
    user,
    can,
    condition,
    customRedirectTo,
    location.search,
    authConfig.authRoute,
    authConfig.roleRoute,
    authConfig.tierRoute,
  ]);

  return redirectState;
}
