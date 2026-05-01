// packages/ui/src/internal/layout/components/footer/useLegalLinks.ts

import type { AppMetadata } from '@donotdev/core';

export interface FooterLegalLink {
  path: string;
  label: string;
}

const DEFAULT_LINKS: FooterLegalLink[] = [
  { path: '#cookie-settings', label: 'footer.legal.cookieSettings' },
  { label: 'footer.legal.privacyPolicy', path: '/privacy' },
  { label: 'footer.legal.termsOfService', path: '/terms' },
];

/**
 * Returns the configured legal links for the footer.
 * Handles the logic: null = hide, undefined = defaults, array = custom
 *
 * @remarks Not a hook — no React state or effects. Named with `get` prefix.
 */
export const getLegalLinks = (
  footerConfig: AppMetadata['footer']
): FooterLegalLink[] => {
  // If explicitly null, return empty array (hidden)
  if (footerConfig?.legalLinks === null) {
    return [];
  }

  // Use configured links or defaults
  return footerConfig?.legalLinks ?? DEFAULT_LINKS;
};

/** @deprecated Use getLegalLinks instead */
export const useLegalLinks = getLegalLinks;
