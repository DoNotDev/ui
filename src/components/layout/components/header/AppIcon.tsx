// packages/ui/src/components/layout/components/header/AppIcon.tsx

/**
 * @fileoverview AppIcon - Logo.svg icon with theme support
 * @description AppIcon works with logo.svg (user must provide).
 * Inlines SVG content from build-time data for CSS variable theming.
 * Works in both CSR and SSR. Falls back to img tag if logo missing.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { cn } from '@donotdev/components';
import { useAppConfig } from '@donotdev/core';

import { AssetResolver } from '../../../../utils/assetResolver';
import { sanitizeSvg } from '../../../../utils/sanitizeSvg';

/** Props for the AppIcon component. */
export interface AppIconProps {
  /** Alt text - falls back to app.name from AppConfig */
  alt?: string;
  /** Size preset or custom size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'header' | string;
  /** Additional className */
  className?: string;
}

const SIZE_STYLES = {
  sm: { width: 'var(--icon-md)', height: 'var(--icon-md)' },
  md: { width: 'var(--icon-touch)', height: 'var(--icon-touch)' },
  lg: { width: 'var(--icon-touch)', height: 'var(--icon-touch)' },
  xl: { width: 'var(--touch-target)', height: 'var(--touch-target)' },
  header: { height: 'var(--icon-touch)', width: 'auto' },
} as const;

/**
 * AppIcon - Application icon component
 *
 * Uses logo.svg (user must provide). Reads SVG content synchronously from build-time data.
 * CSS variables (var(--primary), var(--accent)) work automatically when SVG is inlined.
 * Falls back to img tag if logo.svg is not available.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const AppIcon = ({ alt, size = 'header', className }: AppIconProps) => {
  const appName = useAppConfig('name');
  const appShortName = useAppConfig('shortName');
  const resolvedAlt = alt || appName || appShortName || 'App';

  const svgContent = AssetResolver.getLogoSvgContent();
  const logoPath = AssetResolver.resolveLogo();

  const sizeStyle =
    typeof size === 'string' && size in SIZE_STYLES
      ? SIZE_STYLES[size as keyof typeof SIZE_STYLES]
      : typeof size === 'string'
        ? {}
        : { width: size, height: size };

  // Inline SVG - CSS variables work automatically
  if (svgContent) {
    return (
      <div
        className={cn('app-icon-header', className)}
        style={{
          display: 'inline-flex',
          ...sizeStyle,
        }}
        role="img"
        aria-label={resolvedAlt}
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgContent) }}
      />
    );
  }

  // Fallback to img tag if SVG content not available
  return (
    <img
      src={logoPath}
      alt={resolvedAlt}
      className={cn(className)}
      style={{
        objectFit: 'contain',
        ...sizeStyle,
      }}
    />
  );
};

export default AppIcon;
