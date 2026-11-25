'use client';
// packages/ui/src/internal/layout/components/footer/FooterLegalLinks.tsx

/**
 * @fileoverview FooterLegalLinks Component
 * @description Legal links component for use in sidebars when footer is hidden
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Button, BUTTON_VARIANT, Stack } from '@donotdev/components';
import { useTranslation, maybeTranslate, useAppConfig } from '@donotdev/core';
import type { AppMetadata } from '@donotdev/core';

import { FooterBranding } from './FooterBranding';
import { getLegalLinks, type FooterLegalLink } from './useLegalLinks';
import { useCookieNoticeRequired } from '../../../../components/cookie-consent/useCookieNoticeRequired';
import { Link } from '../../../../routing/Link';

export interface FooterLegalLinksProps {
  /** App metadata for legal links (auto-reads from config if not provided) */
  app?: AppMetadata;
  /** Direction for links layout */
  direction?: 'row' | 'column';
  /**
   * Wrap the links onto more lines when the row is too narrow (`direction="row"`): the
   * CSS-driven footer layout, right in the server HTML at every width (no breakpoint
   * hook). @default 'nowrap'
   */
  wrap?: 'nowrap' | 'wrap';
  /** Gap between links */
  gap?: 'none' | 'tight' | 'medium' | 'large';
  /** Alignment of links */
  align?: 'start' | 'center' | 'end' | 'stretch';
}

/** Footer text size, inherited by the links (the `link` variant takes its text's size). */
const LINKS_STYLE = { fontSize: 'var(--font-size-xs)' } as const;

/**
 * FooterLegalLinks - Legal links component
 *
 * Renders legal links from app.footer.legalLinks config.
 * If app not provided, reads from app config automatically.
 * Used in footer and sidebar when footer zone is hidden.
 * Each link is a Button `link` variant rendered as the router Link: the framework's one
 * text-link rule (colour, underline, hover, as wide as its text, minimum target height),
 * at the footer's text size.
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const FooterLegalLinks: React.ComponentType<FooterLegalLinksProps> = ({
  app,
  direction = 'column',
  gap = 'tight',
  align = 'stretch',
  wrap = 'nowrap',
}) => {
  const { t } = useTranslation('dndev');
  const appConfig = useAppConfig('app');
  const resolvedApp = app || appConfig || {};
  const cookieNoticeRequired = useCookieNoticeRequired();
  const links = getLegalLinks(resolvedApp.footer, cookieNoticeRequired);

  if (links.length === 0) {
    return null;
  }

  return (
    // As wide as its links (fit): beside other footer content in a wrapping row, the
    // group moves to its own line only when the row is too narrow.
    <Stack
      direction={direction}
      wrap={wrap}
      gap={gap}
      align={align}
      width="fit"
      style={LINKS_STYLE}
    >
      {links.map((link: FooterLegalLink) => (
        <Button
          key={link.path}
          variant={BUTTON_VARIANT.LINK}
          render={({ children, ...props }) => (
            <Link path={link.path} {...props}>
              {children}
            </Link>
          )}
        >
          {maybeTranslate(t, link.label)}
        </Button>
      ))}
      <FooterBranding />
    </Stack>
  );
};

export default FooterLegalLinks;
