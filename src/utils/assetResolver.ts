'use client';
// packages/ui/src/utils/assetResolver.ts

/**
 * @fileoverview Modern asset resolution system for DoNotDev
 * @description Handles logo and favicon resolution with format preferences and fallbacks
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import {
  getDndevConfig,
  isClient,
  isDev,
  resolveFaviconFiles,
} from '@donotdev/core';
import type { FaviconSet } from '@donotdev/core';

/**
 * Asset formats interface
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface AssetFormats {
  svg?: string;
  png?: string;
  webp?: string;
  avif?: string;
}

/**
 * Favicon set: the `@donotdev/core` type ({@link resolveFaviconFiles}), re-exported
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export type { FaviconSet };

interface BrowserSupport {
  svg: boolean;
  webp: boolean;
  avif: boolean;
}

interface AssetManifest {
  logo?: {
    optimal?: string | null;
    fallback?: string | null;
    available?: string[];
  };
  favicon?: {
    optimal?: string | null;
    fallback?: string | null;
    available?: string[];
  };
  appleTouchIcon?: string | null;
  androidChrome?: {
    192?: string | null;
    512?: string | null;
  };
  manifest?: string | null;
  modernFormats?: string[];
  fallbackFormats?: string[];
  all?: string[];
}

// Global types are imported from @donotdev/core
// No local declarations needed

/**
 * Modern asset resolution with format preference and browser capability detection
 * Follows Next.js Image optimization patterns
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export class AssetResolver {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- why: value type flows into the public inferred return of getDebugInfo().cache; tightening it is an API change (see any-audit)
  private static cache = new Map<string, any>();

  /**
   * Check if browser supports modern image formats
   */
  static getBrowserSupport(): BrowserSupport {
    // SSR-safe browser detection
    if (!isClient()) {
      return { svg: true, webp: false, avif: false };
    }

    const cached = this.cache.get('browser-support');
    if (cached) return cached;

    const support: BrowserSupport = {
      svg: true, // All modern browsers support SVG
      webp: false,
      avif: false,
    };

    // WebP support detection
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      support.webp =
        canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) {
      support.webp = false;
    }

    // AVIF support detection (newer format)
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      support.avif =
        canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    } catch (e) {
      support.avif = false;
    }

    this.cache.set('browser-support', support);
    return support;
  }

  /**
   * Recursively extract all string values from nested object/array structure
   */
  private static extractStringValues(obj: unknown): string[] {
    const values: string[] = [];
    if (obj === null || obj === undefined) return values;

    if (typeof obj === 'string') {
      values.push(obj);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        values.push(...this.extractStringValues(item));
      }
    } else if (typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        values.push(...this.extractStringValues(value));
      }
    }

    return values;
  }

  /**
   * Whether the build-time asset manifest lists `path` (any string in its nested objects
   * and arrays). The server render and the browser read the same manifest
   * ({@link getAssetManifest}), so they answer the same and the HTML hydrates.
   */
  static assetExists(path: string): boolean {
    const manifest = this.getAssetManifest();
    if (!manifest) return false;

    // Extract all string paths from nested manifest structure
    const allPaths = this.extractStringValues(manifest);
    return allPaths.includes(path);
  }

  /**
   * The build-time asset manifest (`getDndevConfig().assets.mapping`), or null before the
   * generated asset config ran. Read on the server too: the app's generated config sets it
   * on `globalThis` at module load in the Next SSR process (`src/config/dndev-config-asset.js`,
   * imported first by `ClientLayout`) and in the browser (same file on Next, the Vite
   * assets virtual module), so every resolver gives the server render and the hydration
   * pass the same paths.
   */
  static getAssetManifest(): AssetManifest | null {
    const config = getDndevConfig();
    return config?.assets?.mapping || null;
  }

  /**
   * Get logo SVG content for inline rendering
   * Works in both CSR and SSR (globalThis available in both contexts)
   * @returns {string | null} SVG content or null if not available
   */
  static getLogoSvgContent(): string | null {
    const config = getDndevConfig();
    return config?.assets?.logoSvgContent || null;
  }

  /**
   * Resolve logo path
   * Rule: Use manifest optimal if available, otherwise /logo.svg (user must provide).
   * Cached once the manifest is read (the server process keeps the cache across requests,
   * so a resolution made before the generated config ran is not kept).
   */
  static resolveLogo(customPath?: string): string {
    if (customPath) return customPath;

    const cacheKey = 'logo';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const manifest = this.getAssetManifest();
    const logoPath = manifest?.logo?.optimal || '/logo.svg';

    if (manifest) this.cache.set(cacheKey, logoPath);
    return logoPath;
  }

  /**
   * Direct asset existence check for development
   * More reliable than the build-time detection
   *
   * **Limitation:** This is a synchronous heuristic that always returns true
   * when `new Image()` doesn't throw. It does NOT wait for the image to load,
   * so it cannot detect 404s. A proper async check would require returning a
   * Promise<boolean> via Image.onload/onerror, but that would change the
   * synchronous contract used by resolveLogo/resolveFaviconSet.
   */
  private static directAssetCheck(path: string): boolean {
    if (!isClient()) return false;

    try {
      // Create a temporary image element to test if the resource exists
      const testImg = new Image();
      testImg.src = path;

      // Synchronous heuristic: assumes asset exists if Image() doesn't throw.
      // Cannot validate actual load — see JSDoc limitation above.
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve complete favicon set: `resolveFaviconFiles` (`@donotdev/core`) over the
   * build-time manifest ({@link assetExists}). Same set on the server and in the browser
   * (both read the manifest); cached once the manifest is read.
   */
  static resolveFaviconSet(): FaviconSet {
    const cacheKey = 'favicon-set';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const faviconSet = resolveFaviconFiles((path) => this.assetExists(path));
    if (this.getAssetManifest()) this.cache.set(cacheKey, faviconSet);
    return faviconSet;
  }

  /**
   * Resolve optimal favicon for basic usage
   */
  static resolveFavicon(): string {
    const manifest = this.getAssetManifest();
    if (manifest?.favicon?.optimal) {
      return manifest.favicon.optimal;
    }

    // Format preference: SVG > ICO > PNG
    const candidates = [
      '/favicon.svg',
      '/favicon.ico',
      '/favicon.png',
      '/logo.svg',
    ];

    for (const candidate of candidates) {
      if (this.assetExists(candidate)) {
        return candidate;
      }
    }

    return '/favicon.svg';
  }

  /**
   * Clear asset resolution cache
   * Useful when assets change during development
   */
  static clearCache(): void {
    this.cache.clear();

    // In development, also clear any browser caches for immediate feedback
    if (isDev() && isClient()) {
      // Force re-evaluation on next resolution
    }
  }

  /**
   * Get debug information about detected assets
   */
  static getDebugInfo() {
    return {
      browserSupport: this.getBrowserSupport(),
      detectedAssets: isClient() ? getDndevConfig()?.assets?.mapping : null,
      assetManifest: this.getAssetManifest(),
      cache: Object.fromEntries(this.cache),
    };
  }
}

/**
 * Utility function for logo resolution
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function resolveLogo(customPath?: string): string {
  return AssetResolver.resolveLogo(customPath);
}

/**
 * Utility function for favicon resolution
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function resolveFaviconSet(): FaviconSet {
  return AssetResolver.resolveFaviconSet();
}

// Initialize AssetResolver in development for immediate SVG preference
if (isDev()) {
  // Clear any cached values to force fresh detection
  AssetResolver.clearCache();

  // Force immediate SVG preference detection
  if (isClient()) {
    window.addEventListener('DOMContentLoaded', () => {
      AssetResolver.clearCache();
    });
  }
}

// Named export only (no default export needed)
