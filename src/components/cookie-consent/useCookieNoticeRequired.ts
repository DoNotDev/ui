'use client';
// packages/ui/src/components/cookie-consent/useCookieNoticeRequired.ts

/**
 * @fileoverview Whether the app shows any cookie notice
 * @description Single decision for the consent banner and the `#cookie-settings`
 * link, identical on Next and Vite. When the app sets only strictly necessary
 * cookies (no non-necessary category in `appConfig.features.requiredCookies`, no
 * feature with optional cookies), nothing is consentable: no banner, no settings link.
 *
 * @version 0.1.0
 * @since 0.1.49
 * @author AMBROISE PARK Consulting
 */

import { useAppConfig, isCookieNoticeRequired } from '@donotdev/core';

/**
 * `true` when the app has a non-necessary cookie category to consent to.
 * `false` when only strictly necessary cookies are set (CNIL / loi Informatique et
 * Libertés art. 82: no consent, no banner).
 */
export function useCookieNoticeRequired(): boolean {
  const features = useAppConfig().features;
  return isCookieNoticeRequired(features?.requiredCookies);
}
