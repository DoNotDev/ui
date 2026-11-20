'use client';
// packages/ui/src/components/cookie-consent/ConsentBanner.tsx

/**
 * @fileoverview ConsentBanner component
 * @description Lazy loaded consent banner component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Suspense, lazy } from 'react';

import { useConsent } from '@donotdev/core';

import { useCookieNoticeRequired } from './useCookieNoticeRequired';

// Lazy load the actual consent component
const CookieConsent = lazy(() => import('./CookieConsent'));

/**
 * ConsentBanner - Lazy loaded consent component
 * Shows if user hasn't consented yet OR if showBanner flag is set.
 * Renders nothing (and never loads the banner chunk) when the app sets only strictly
 * necessary cookies.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function ConsentBanner() {
  const hasConsented = useConsent('hasConsented');
  const showBanner = useConsent('showBanner');
  const noticeRequired = useCookieNoticeRequired();

  if (!noticeRequired) return null;
  if (hasConsented && !showBanner) return null;

  return (
    <Suspense fallback={null}>
      <CookieConsent />
    </Suspense>
  );
}
export default ConsentBanner;
