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

// Lazy load the actual consent component
const CookieConsent = lazy(() => import('./CookieConsent'));

/**
 * ConsentBanner - Lazy loaded consent component
 * Shows if user hasn't consented yet OR if showBanner flag is set
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function ConsentBanner() {
  const hasConsented = useConsent('hasConsented');
  const showBanner = useConsent('showBanner');

  if (hasConsented && !showBanner) return null;

  return (
    <Suspense fallback={null}>
      <CookieConsent />
    </Suspense>
  );
}
export default ConsentBanner;
