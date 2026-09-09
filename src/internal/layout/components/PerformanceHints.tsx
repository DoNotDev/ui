'use client';
// packages/ui/src/internal/layout/components/PerformanceHints.tsx

/**
 * @fileoverview Performance hints for faster page loads
 * @description Adds preconnect, dns-prefetch, and font preload hints
 *
 * - Preconnect establishes early connections (DNS + TCP + TLS) to origins
 *   the page will need, saving 100-300ms per origin on slow networks.
 * - Font preload initiates font downloads early, reducing LCP by ~500-1000ms
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { ComponentType } from 'react';

import { HeadTags } from './HeadTags';

/**
 * Common third-party origins that benefit from preconnect
 * Only includes origins that are commonly used and safe to preconnect
 */
const DEFAULT_PRECONNECTS = [
  // YouTube embeds - thumbnails and iframe
  'https://img.youtube.com',
  'https://www.youtube.com',
  // Google Fonts (if used)
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  // Google APIs (Firebase, Analytics, etc.)
  'https://www.googleapis.com',
  // Stripe (if used)
  'https://js.stripe.com',
];

/**
 * Origins to dns-prefetch only (less aggressive than preconnect)
 * Use for origins that might be needed but aren't certain
 */
const DEFAULT_DNS_PREFETCH = [
  'https://www.google-analytics.com',
  'https://www.googletagmanager.com',
];

/**
 * Default critical fonts to preload.
 * Empty: when using the framework's Vite or Next setup, font preload is handled by build-time
 * injection (Vite: FontPreloadPlugin patches index.html; Next: FontPreloadLinks in root layout
 * reads public/dndev-font-preloads.json). Pass fontPreloads only for extra/custom URLs.
 */
const DEFAULT_FONT_PRELOADS: string[] = [];

interface FontPreload {
  /** Path to font file (e.g., '/fonts/Inter-latin.woff2') */
  href: string;
  /** Font MIME type @default 'font/woff2' */
  type?: string;
  /** Cross-origin setting @default 'anonymous' */
  crossOrigin?: 'anonymous' | 'use-credentials';
}

interface PerformanceHintsProps {
  /**
   * Additional origins to preconnect to
   * These are merged with defaults
   */
  preconnects?: string[];
  /**
   * Additional origins to dns-prefetch
   * These are merged with defaults
   */
  dnsPrefetch?: string[];
  /**
   * Additional fonts to preload (optional). Framework injects preloads at build time for Vite/Next;
   * use this prop only for extra or custom font URLs.
   * @default []
   */
  fontPreloads?: (string | FontPreload)[];
  /**
   * Disable default preconnects (use only custom ones)
   * @default false
   */
  disableDefaults?: boolean;
  /**
   * Disable default font preloads
   * @default false
   */
  disableFontPreloads?: boolean;
}

/**
 * PerformanceHints component
 *
 * Adds preconnect, dns-prefetch, and font preload hints to improve page load.
 * Automatically includes common third-party origins and critical fonts.
 *
 * @example
 * ```tsx
 * // Default: preconnect/dns-prefetch only; font preload handled by framework build (Vite/Next)
 * <PerformanceHints />
 *
 * // Add custom font preload URLs
 * <PerformanceHints fontPreloads={[customFontUrl]} />
 *
 * // Disable font preloads
 * <PerformanceHints disableFontPreloads />
 * ```
 */
const PerformanceHints: ComponentType<PerformanceHintsProps> = ({
  preconnects = [],
  dnsPrefetch = [],
  fontPreloads = [],
  disableDefaults = false,
  disableFontPreloads = false,
}) => {
  // Merge defaults with custom origins
  const allPreconnects = disableDefaults
    ? preconnects
    : [...new Set([...DEFAULT_PRECONNECTS, ...preconnects])];

  const allDnsPrefetch = disableDefaults
    ? dnsPrefetch
    : [...new Set([...DEFAULT_DNS_PREFETCH, ...dnsPrefetch])];

  // Normalize font preloads to FontPreload objects
  const normalizeFontPreload = (font: string | FontPreload): FontPreload =>
    typeof font === 'string' ? { href: font } : font;

  const customFontPaths = fontPreloads.map((f) =>
    typeof f === 'string' ? f : f.href
  );
  const allFontPreloads = disableFontPreloads
    ? []
    : fontPreloads.length > 0
      ? fontPreloads.map(normalizeFontPreload)
      : DEFAULT_FONT_PRELOADS.filter((f) => !customFontPaths.includes(f)).map(
          normalizeFontPreload
        );

  return (
    <HeadTags>
      {/* Font Preload: Initiate font downloads early for faster LCP */}
      {allFontPreloads.map((font) => (
        <link
          key={`font-${font.href}`}
          rel="preload"
          as="font"
          href={font.href}
          type={font.type || 'font/woff2'}
          crossOrigin={font.crossOrigin || 'anonymous'}
        />
      ))}

      {/* Preconnect: Full connection setup (DNS + TCP + TLS) */}
      {allPreconnects.map((origin) => (
        <link
          key={`preconnect-${origin}`}
          rel="preconnect"
          href={origin}
          crossOrigin="anonymous"
        />
      ))}

      {/* DNS Prefetch: DNS lookup only (lighter than preconnect) */}
      {allDnsPrefetch.map((origin) => (
        <link key={`dns-${origin}`} rel="dns-prefetch" href={origin} />
      ))}
    </HeadTags>
  );
};

export default PerformanceHints;
export type { FontPreload, PerformanceHintsProps };
