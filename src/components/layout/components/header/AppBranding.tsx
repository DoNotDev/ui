// packages/ui/src/components/layout/components/header/AppBranding.tsx

/**
 * @fileoverview AppBranding - Combined logo + title with display modes
 * @description Unified branding component supporting COMPACT (logo only),
 * FULL (logo + title), and AUTO (container-responsive) display modes.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { cn, DISPLAY } from '@donotdev/components';
import { useAppConfig } from '@donotdev/core';

import { Link } from '../../../../routing/Link';
import { AssetResolver } from '../../../../utils/assetResolver';
import { sanitizeSvg } from '../../../../utils/sanitizeSvg';

/** Props for the AppBranding component. */
export interface AppBrandingProps {
  /**
   * Display mode - controls component presentation
   * - 'compact': Logo only
   * - 'full': Logo + title
   * - 'auto': Container-responsive (CSS container queries)
   * @default 'auto'
   */
  display?: (typeof DISPLAY)[keyof typeof DISPLAY];
  /** Whether to link to home (default: true) */
  linkToHome?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AppBranding - Unified branding component
 *
 * Combines AppIcon + AppTitle with DISPLAY mode support.
 * Uses CSS container queries for AUTO mode - no JS breakpoint checks.
 *
 * @example
 * ```tsx
 * // Auto-responsive (default)
 * <AppBranding />
 *
 * // Logo only
 * <AppBranding display="compact" />
 *
 * // Always show logo + title
 * <AppBranding display="full" />
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const AppBranding = ({
  display = DISPLAY.AUTO,
  linkToHome = true,
  className,
}: AppBrandingProps) => {
  const appName = useAppConfig('name');
  const appShortName = useAppConfig('shortName');
  const displayTitle = appShortName || appName || 'App';

  const svgContent = AssetResolver.getLogoSvgContent();
  const logoPath = AssetResolver.resolveLogo();

  const showTitle = display === DISPLAY.FULL || display === DISPLAY.AUTO;

  const logo = svgContent ? (
    <div
      className="app-branding-logo"
      role="img"
      aria-label={displayTitle}
      dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgContent) }}
    />
  ) : AssetResolver.assetExists(logoPath) ? (
    <img src={logoPath} alt={displayTitle} className="app-branding-logo" />
  ) : null;

  const title = showTitle && (
    <span className="app-branding-title" data-display={display}>
      {displayTitle}
    </span>
  );

  const content = (
    <div className={cn('app-branding', className)} data-display={display}>
      {logo}
      {title}
    </div>
  );

  if (linkToHome) {
    return (
      <Link path="/" className="app-branding-link">
        {content}
      </Link>
    );
  }

  return content;
};

export default AppBranding;
