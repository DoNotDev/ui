'use client';
// packages/ui/src/routing/AuthReturnTo.tsx

/**
 * @fileoverview Auth Return-To Navigation + Guard Toast
 * @description Consumes `dndev.auth.returnTo` from sessionStorage after OAuth
 * redirect and navigates back to the pre-auth path.
 * Also consumes `dndev.auth.guardToast` flag to show a toast when
 * useNavigate blocked a SPA nav to a protected route.
 *
 * Mount once at layout/provider level (RootLayout). Renders nothing.
 * Works on all routes - unlike AuthGuard which only runs on guarded pages.
 *
 * @version 0.1.0
 * @since 0.6.0
 * @author AMBROISE PARK Consulting
 */

import { useEffect } from 'react';

import { useToast } from '@donotdev/components';
import { isClient, safeSessionStorage, useTranslation } from '@donotdev/core';
import { useNavigate } from '@donotdev/ui/routing/hooks';

import { useAuthSafe } from '../utils/useAuthSafe';

/**
 * AuthReturnTo - Restores navigation after OAuth redirect.
 *
 * OAuth always lands on `/` (origin). This component watches for sign-in,
 * reads the saved returnTo path, and navigates back. Runs once per sign-in.
 *
 * Also shows a warning toast when the user was redirected by the auth guard
 * (flag set by useNavigate, consumed here on mount of the landing page).
 *
 * @component
 */
export function AuthReturnTo() {
  const user = useAuthSafe('user');
  const navigate = useNavigate();
  const { t } = useTranslation('dndev');
  const { toast } = useToast();

  // Show guard toast on landing page after auth redirect
  useEffect(() => {
    if (!isClient()) return;
    const flag = safeSessionStorage.getItem('dndev.auth.guardToast');
    if (!flag) return;
    safeSessionStorage.removeItem('dndev.auth.guardToast');
    toast(
      'warning',
      t('guard.signInRequired', 'Please sign in to access this page')
    );
  }, []);

  // Return-to after sign-in
  useEffect(() => {
    if (!user || !isClient()) return;
    const returnTo = safeSessionStorage.getItem('dndev.auth.returnTo');
    if (!returnTo) return;
    safeSessionStorage.removeItem('dndev.auth.returnTo');
    if (returnTo !== window.location.pathname) {
      navigate(returnTo, { replace: true });
    }
  }, [user, navigate]);

  return null;
}
