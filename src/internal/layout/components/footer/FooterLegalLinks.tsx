// packages/ui/src/internal/layout/components/footer/FooterLegalLinks.tsx

/**
 * @fileoverview FooterLegalLinks Component
 * @description Legal links component for use in sidebars when footer is hidden
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Stack } from '@donotdev/components';
import { useTranslation, maybeTranslate, useAppConfig } from '@donotdev/core';
import type { AppMetadata } from '@donotdev/core';

import { FooterBranding } from './FooterBranding';
import { useLegalLinks, type FooterLegalLink } from './useLegalLinks';
import { Link } from '../../../../routing/Link';

export interface FooterLegalLinksProps {
  /** App metadata for legal links (auto-reads from config if not provided) */
  app?: AppMetadata;
  /** Direction for links layout */
  direction?: 'row' | 'column';
  /** Gap between links */
  gap?: 'none' | 'tight' | 'medium' | 'large';
  /** Alignment of links */
  align?: 'start' | 'center' | 'end' | 'stretch';
}

/**
 * FooterLegalLinks - Legal links component
 *
 * Renders legal links from app.footer.legalLinks config.
 * If app not provided, reads from app config automatically.
 * Used in footer and sidebar when footer zone is hidden.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const FooterLegalLinks: React.ComponentType<FooterLegalLinksProps> = ({
  app,
  direction = 'column',
  gap = 'tight',
  align = 'stretch',
}) => {
  const { t } = useTranslation('dndev');
  const appConfig = useAppConfig('app');
  const resolvedApp = app || appConfig || {};
  const links = useLegalLinks(resolvedApp.footer);

  const linkStyle = {
    transition: 'color var(--dur-fast) ease-out',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    color: 'var(--muted-foreground)',
    fontSize: 'var(--font-size-xs)',
  };

  if (links.length === 0) {
    return null;
  }

  return (
    <Stack direction={direction} gap={gap} align={align}>
      {links.map((link: FooterLegalLink) => (
        <Link
          key={link.path}
          path={link.path}
          style={linkStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'var(--muted-foreground)')
          }
        >
          {maybeTranslate(t, link.label)}
        </Link>
      ))}
      <FooterBranding />
    </Stack>
  );
};

export default FooterLegalLinks;
