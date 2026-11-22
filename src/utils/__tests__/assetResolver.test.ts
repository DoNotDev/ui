// packages/ui/src/utils/__tests__/assetResolver.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@donotdev/core', async () => {
  const platform = await import(
    '../../../../core/utils/src/client/platformDetection'
  );
  const config = await import('../../../../core/utils/src/client/configUtils');
  // resolveFaviconSet resolves with resolveFaviconFiles
  const headTags = await import('../../../../core/utils/src/common/headTags');
  return {
    resolveFaviconFiles: headTags.resolveFaviconFiles,
    isClient: platform.isClient,
    getDndevConfig: config.getDndevConfig,
    isDev: () => false,
  };
});

import { AssetResolver } from '../assetResolver';

/**
 * Asset manifest of an app with logo.svg, logo.png, favicons and the generated PWA icons
 * (AssetDiscovery._buildAssetManifest output, as the Next asset config sets it).
 */
const MAPPING = {
  logo: { optimal: '/logo.png', fallback: '/logo.png' },
  favicon: { optimal: '/favicon.svg', fallback: '/favicon.ico' },
  appleTouchIcon: '/apple-touch-icon.png',
  androidChrome: { 192: null, 512: null },
  manifest: '/manifest.json',
  modernFormats: [
    '/apple-touch-icon.png',
    '/icon-192x192.png',
    '/icon-512x512.png',
    '/logo.png',
    '/og-image.png',
  ],
  fallbackFormats: ['/favicon.ico', '/favicon.svg', '/logo.svg'],
};

/** Resolve everything the head and header render, fresh (no cache from another run). */
function resolveAll() {
  AssetResolver.clearCache();
  return {
    logo: AssetResolver.resolveLogo(),
    favicon: AssetResolver.resolveFavicon(),
    faviconSet: AssetResolver.resolveFaviconSet(),
    icon512: AssetResolver.assetExists('/icon-512x512.png'),
    logoPng: AssetResolver.assetExists('/logo.png'),
  };
}

/** Same, as the Next SSR process sees it: the config is set, no window / document. */
function resolveOnServer() {
  vi.stubGlobal('window', undefined);
  vi.stubGlobal('document', undefined);
  try {
    return resolveAll();
  } finally {
    vi.unstubAllGlobals();
  }
}

describe('AssetResolver on the server and in the browser', () => {
  beforeEach(() => {
    globalThis._DNDEV_CONFIG_ = {
      assets: { mapping: MAPPING },
    } as unknown as typeof globalThis._DNDEV_CONFIG_;
  });
  afterEach(() => {
    delete (globalThis as { _DNDEV_CONFIG_?: unknown })._DNDEV_CONFIG_;
    AssetResolver.clearCache();
  });

  // Regression: the server answered "no asset" (isClient gate), so the SSR HTML held
  // fallbacks the browser did not (hydration failure on every Next page)
  it('resolves the same assets in both, from the build-time manifest', () => {
    const server = resolveOnServer();
    const client = resolveAll();
    expect(server).toEqual(client);
    expect(server).toEqual({
      logo: '/logo.png',
      favicon: '/favicon.svg',
      faviconSet: {
        svg: '/favicon.svg',
        ico: '/favicon.ico',
        png16: undefined,
        png32: undefined,
        apple180: '/apple-touch-icon.png',
        android192: '/icon-192x192.png',
        android512: '/icon-512x512.png',
      },
      icon512: true,
      logoPng: true,
    });
  });

  it('does not keep a resolution made before the asset config ran', () => {
    delete (globalThis as { _DNDEV_CONFIG_?: unknown })._DNDEV_CONFIG_;
    AssetResolver.clearCache();
    expect(AssetResolver.resolveLogo()).toBe('/logo.svg');
    globalThis._DNDEV_CONFIG_ = {
      assets: { mapping: MAPPING },
    } as unknown as typeof globalThis._DNDEV_CONFIG_;
    expect(AssetResolver.resolveLogo()).toBe('/logo.png');
    expect(AssetResolver.resolveFaviconSet().apple180).toBe('/apple-touch-icon.png');
  });
});
