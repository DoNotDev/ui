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
 * Handles the logic: `footer: null` or `legalLinks: null` = hide, undefined = defaults,
 * array = custom
 *
 * @remarks Not a hook — no React state or effects. Named with `get` prefix.
 */
export const getLegalLinks = (
  footerConfig: AppMetadata['footer']
): FooterLegalLink[] => {
  // No footer at all, or links explicitly null: hidden (also in presets that show them in the sidebar)
  if (footerConfig === null || footerConfig?.legalLinks === null) {
    return [];
  }

  // Use configured links or defaults
  return footerConfig?.legalLinks ?? DEFAULT_LINKS;
};
