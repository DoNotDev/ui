'use client';
// packages/ui/src/internal/layout/components/footer/FooterBranding.tsx

/**
 * @fileoverview FooterBranding Component
 * @description "Links to DoNotDev.com in the footers of generated apps.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { ExternalLink } from 'lucide-react';

import { Button, BUTTON_VARIANT, DISPLAY } from '@donotdev/components';
import { getPlatformEnvVar } from '@donotdev/core';

export interface FooterBrandingProps {
  /** Additional CSS classes */
  className?: string;
}

/** Footer text size: the branding link reads as the footer's legal links. */
const BRANDING_STYLE = { fontSize: 'var(--font-size-xs)' } as const;

/**
 * FooterBranding - Framework branding link (power move)
 *
 * Shows AMBROISE-PARK for framework's own site (donotdev.com),
 * otherwise shows DoNotDev for consumer apps. A Button `link` variant (the one text-link
 * rule: as wide as its text, minimum target height) rendered as an external `<a>`,
 * with the external-link icon at its end.
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const FooterBranding: React.ComponentType<FooterBrandingProps> = ({
  className,
}) => {
  const appUrl = getPlatformEnvVar('APP_URL');
  const isFrameworkSite = appUrl === 'https://donotdev.com';

  return (
    <Button
      variant={BUTTON_VARIANT.LINK}
      display={DISPLAY.FULL}
      icon={ExternalLink}
      iconEnd
      className={className}
      style={BRANDING_STYLE}
      render={({ children, ...props }) => (
        <a
          href={
            isFrameworkSite
              ? 'https://www.ambroise-park.com'
              : 'https://donotdev.com'
          }
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      )}
    >
      {isFrameworkSite ? 'AMBROISE-PARK' : 'DoNotDev'}
    </Button>
  );
};

export default FooterBranding;
