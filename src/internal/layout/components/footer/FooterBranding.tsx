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

import { useAppConfig, getPlatformEnvVar } from '@donotdev/core';

export interface FooterBrandingProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * FooterBranding - Framework branding link (power move)
 *
 * Shows AMBROISE-PARK for framework's own site (donotdev.com),
 * otherwise shows DoNotDev for consumer apps.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const FooterBranding: React.ComponentType<FooterBrandingProps> = ({
  className,
}) => {
  const appUrl = getPlatformEnvVar('APP_URL');
  const isFrameworkSite = appUrl === 'https://donotdev.com';

  return (
    <a
      href={
        isFrameworkSite
          ? 'https://www.ambroise-park.com'
          : 'https://donotdev.com'
      }
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--gap-sm)',
        fontSize: 'var(--font-size-xs)',
      }}
    >
      {isFrameworkSite ? 'AMBROISE-PARK' : 'DoNotDev'}
      <ExternalLink
        style={{ width: '12px', height: '12px' }}
        aria-hidden="true"
      />
    </a>
  );
};

export default FooterBranding;
