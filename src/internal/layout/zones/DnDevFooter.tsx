// packages/ui/src/internal/layout/zones/DnDevFooter.tsx

/**
 * @fileoverview DnDevFooter Zone Component
 * @description Footer zone with smart defaults.
 *
 * Default layout: Stack(FooterCopyright, FooterLegalLinks, FooterBranding)
 * - Desktop: 2-zone [Copyright] | [Links + Branding]
 * - Mobile: 2-line stacked, centered
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { memo } from 'react';
import type { ReactNode } from 'react';

import { Stack } from '@donotdev/components';
import type { AppMetadata } from '@donotdev/core';
import { useBreakpoint, useTranslation, maybeTranslate } from '@donotdev/core';

import { Link } from '../../../routing/Link';
import { FooterBranding } from '../components/footer/FooterBranding';
import {
  getLegalLinks,
  type FooterLegalLink,
} from '../components/footer/useLegalLinks';

// import { renderSlotValue } from '../renderers/slotUtils'; // Reserved for future slot override support

export interface DnDevFooterProps {
  /** Custom mode: full zone replacement. When provided, app prop is ignored and no polish CSS applies. */
  children?: ReactNode;
  /** App metadata for copyright/links */
  app?: AppMetadata;
}

/**
 * DnDevFooter - Simple footer: Copyright (left) | LegalLinks + DoNotDev (right)
 *
 * DoNotDev branding is ALWAYS appended and cannot be removed.
 * Footer is automatically configured from app.footer config.
 *
 * Configuration precedence:
 * 1. app.footer === null -> render nothing
 * 2. app.footer.copyright === null -> hide copyright
 * 3. app.footer.copyright === undefined -> default copyright
 * 4. app.footer.copyright === string -> custom copyright
 * 5. LegalLinks from app.footer.legalLinks (defaults if undefined)
 * 6. DoNotDev branding always appended
 *
 * @critical The `<footer>` MUST have `role="contentinfo"` and className `"footer"`.
 * ALL footer CSS in layout-variables.css targets `footer[role='contentinfo']`.
 * This controls: grid placement, height, border, footer-mode scroll behavior,
 * preset-specific visibility (moolti/plain hide footer, blog hides on mobile).
 * DO NOT change role, tag, or className.
 */
function DnDevFooterComponent({
  children,
  app = {},
}: DnDevFooterProps): ReactNode {
  const { t } = useTranslation('dndev');
  const isLaptopOrDesktop = useBreakpoint('isLaptopOrDesktop');

  // Get legal links (defaults or custom) — must be called before any return
  const links = getLegalLinks(app?.footer);

  // Custom mode: consumer owns zone visuals, structural wrapper only
  if (children !== undefined) {
    return (
      <footer role="contentinfo" className="footer" data-custom>
        {children}
      </footer>
    );
  }

  // Explicit null hides footer
  if (app?.footer === null) {
    return null;
  }

  // Copyright: null = hide, undefined = default, string = custom
  const copyrightConfig = app.footer?.copyright;
  const showCopyright = copyrightConfig !== null;
  const copyrightText =
    copyrightConfig === undefined
      ? `© ${new Date().getFullYear()} ${app.name || 'App'}. ${t('footer.legal.allRightsReserved')}`
      : copyrightConfig;

  // Desktop/Wide: 2-zone layout [Copyright] | [Links + DoNotDev]
  if (isLaptopOrDesktop) {
    return (
      <footer role="contentinfo" className="footer">
        <Stack direction="row" align="center" justify="between" gap="none">
          {showCopyright && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <span className="footer-copyright">{copyrightText}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Stack direction="row" align="center">
              {links.map((link: FooterLegalLink) => (
                <Link
                  key={link.path}
                  path={link.path}
                  style={{ fontSize: 'var(--font-size-xs)' }}
                >
                  {maybeTranslate(t, link.label)}
                </Link>
              ))}
              <FooterBranding />
            </Stack>
          </div>
        </Stack>
      </footer>
    );
  }

  // Mobile/Tablet: stacked layout
  return (
    <footer role="contentinfo" className="footer">
      <Stack align="center" gap="tight">
        {showCopyright && (
          <span className="footer-copyright">{copyrightText}</span>
        )}
        <Stack
          direction="row"
          wrap="wrap"
          gap="tight"
          justify="center"
          align="center"
        >
          {links.map((link: FooterLegalLink) => (
            <Link
              key={link.path}
              path={link.path}
              style={{ fontSize: 'var(--font-size-xs)' }}
            >
              {maybeTranslate(t, link.label)}
            </Link>
          ))}
          <FooterBranding />
        </Stack>
      </Stack>
    </footer>
  );
}

export const DnDevFooter = memo(DnDevFooterComponent);
