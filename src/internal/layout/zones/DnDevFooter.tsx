'use client';
// packages/ui/src/internal/layout/zones/DnDevFooter.tsx

/**
 * @fileoverview DnDevFooter Zone Component
 * @description Footer zone with smart defaults.
 *
 * Default layout: a wrapping row (Stack direction="row" wrap="wrap"), CSS only, so the
 * server HTML is the final layout at every width:
 * - Wide: one row [Copyright] | [Legal links + Branding]
 * - Narrow: the row wraps, the links group on its own line (its links wrap too)
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { memo } from 'react';
import type { ReactNode } from 'react';

import { Stack } from '@donotdev/components';
import type { AppMetadata } from '@donotdev/core';
import { useTranslation } from '@donotdev/core';

import { useCookieNoticeRequired } from '../../../components/cookie-consent/useCookieNoticeRequired';
import { FooterBranding } from '../components/footer/FooterBranding';
import { FooterLegalLinks } from '../components/footer/FooterLegalLinks';
import { getLegalLinks } from '../components/footer/useLegalLinks';

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

  // Get legal links (defaults or custom) — must be called before any return
  const cookieNoticeRequired = useCookieNoticeRequired();
  const links = getLegalLinks(app?.footer, cookieNoticeRequired);

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

  // One layout at every width, from CSS (right in the server HTML): [Copyright] |
  // [Links + DoNotDev] on one row; on a narrow screen the row wraps (the links group on
  // its own line, its links wrapping too). A breakpoint hook rendered the desktop row on
  // the server and swapped to the stacked layout after hydration on phones.
  return (
    <footer role="contentinfo" className="footer">
      <Stack
        direction="row"
        wrap="wrap"
        align="center"
        justify="between"
        gap="tight"
      >
        {showCopyright && (
          <span className="footer-copyright">{copyrightText}</span>
        )}
        {links.length > 0 ? (
          <FooterLegalLinks
            app={app}
            direction="row"
            wrap="wrap"
            align="center"
            gap="tight"
          />
        ) : (
          <FooterBranding />
        )}
      </Stack>
    </footer>
  );
}

export const DnDevFooter = memo(DnDevFooterComponent);
