'use client';
// packages/ui/src/internal/layout/components/FaviconHead.tsx

/**
 * @fileoverview Modern favicon system component
 * @description Comprehensive favicon setup following PWA and web.dev best practices
 *
 * IMPORTANT: This component is designed to be rendered inside <head> via:
 * - react-helmet-async
 * - Next.js Head component
 * - Nuxt.js Head component
 * - or similar head management solutions
 *
 * Microsoft Edge Tools false positives:
 * - apple-touch-icons: These ARE placed in <head> via React head management
 * - theme-color: Progressive enhancement - intentionally used for modern browsers
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

import { useFaviconConfig } from '@donotdev/core';

import { AssetResolver } from '../../../utils/assetResolver';
import type { FaviconSet } from '../../../utils/assetResolver';

/**
 * Modern favicon system component
 *
 * Uses configuration from AppConfigProvider context.
 * No props needed - all config comes from useFaviconConfig().
 *
 * Features:
 * - SVG favicon with dark mode support
 * - Complete size set for all devices
 * - PWA manifest integration
 * - Microsoft tile support
 * - Apple touch icons
 * - Prevents default favicon requests
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 * @note This component must be rendered inside <head> via React head management
 */
const FaviconHead: ComponentType = () => {
  const faviconConfig = useFaviconConfig();

  // Return null if disabled
  if (!faviconConfig) return null;

  const {
    appName = 'DoNotDev App',
    themeColor = '#2563eb',
    backgroundColor = '#ffffff',
    includeManifestIcons = true,
    includeMSIcons = false,
  } = faviconConfig;
  const [faviconSet, setFaviconSet] = useState<FaviconSet | null>(null);

  useEffect(() => {
    const resolved = AssetResolver.resolveFaviconSet();
    setFaviconSet(resolved);
  }, []);

  if (!faviconSet) {
    return null;
  }

  return (
    <>
      {/* Modern browsers: SVG favicon with dark mode support */}
      {faviconSet.svg && (
        <link rel="icon" type="image/svg+xml" href={faviconSet.svg} />
      )}

      {faviconSet.ico && (
        <link rel="icon" type="image/x-icon" href={faviconSet.ico} />
      )}

      {/* Standard PNG favicons */}
      {faviconSet.png16 && (
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href={faviconSet.png16}
        />
      )}
      {faviconSet.png32 && (
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href={faviconSet.png32}
        />
      )}

      {/* Apple devices - Optimized for iOS Safari and PWA */}
      {/* NOTE: apple-touch-icon links are correctly placed in <head> via React head management */}
      {faviconSet.apple180 && (
        <>
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href={faviconSet.apple180}
          />
          {/* Apple-specific meta tags */}
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="default"
          />
          <meta name="apple-mobile-web-app-title" content={appName} />
        </>
      )}

      {/* Android/PWA icons */}
      {includeManifestIcons && (
        <>
          {faviconSet.android192 && (
            <link
              rel="icon"
              type="image/png"
              sizes="192x192"
              href={faviconSet.android192}
            />
          )}
          {faviconSet.android512 && (
            <link
              rel="icon"
              type="image/png"
              sizes="512x512"
              href={faviconSet.android512}
            />
          )}
        </>
      )}

      {/* Microsoft tiles (optional) */}
      {includeMSIcons && faviconSet.png32 && (
        <>
          <meta name="msapplication-TileImage" content={faviconSet.png32} />
          <meta name="msapplication-TileColor" content={themeColor} />
          <meta name="msapplication-config" content="/browserconfig.xml" />
        </>
      )}

      {/* Theme integration - Progressive enhancement (Chrome/Safari/Edge support) */}
      {/* NOTE: theme-color is intentionally used for progressive enhancement */}
      <meta name="theme-color" content={themeColor} />
      <meta name="color-scheme" content="light dark" />

      {/* Prevent browser from requesting default favicon */}
      <link rel="shortcut icon" href="data:," />
    </>
  );
};

export default FaviconHead;
