// packages/ui/src/internal/layout/components/__tests__/FaviconHead.test.tsx

import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const favicon = vi.hoisted(() => ({ config: {} as object | false }));

vi.mock('@donotdev/core', async () => {
  // FaviconHead builds its tags with these (shared with the Vite build)
  const headTags = await import(
    '../../../../../../core/utils/src/common/headTags'
  );
  // The real environment and config reads
  const platform = await import(
    '../../../../../../core/utils/src/client/platformDetection'
  );
  const config = await import('../../../../../../core/utils/src/client/configUtils');
  return {
    ...headTags,
    isClient: platform.isClient,
    getDndevConfig: config.getDndevConfig,
    isDev: () => false,
    // Next: React 19 hoists the head tags, no react-helmet-async
    isNextJs: () => true,
    useFaviconConfig: () => favicon.config,
  };
});

import { FAVICON_DEFAULTS } from '../../../../../../core/utils/src/common/headTags';
import { AssetResolver } from '../../../../utils/assetResolver';
import FaviconHead from '../FaviconHead';

/** The Next asset config of an app with logo.svg and the generated favicon and PWA icons. */
const CONFIG = {
  assets: {
    mapping: {
      logo: { optimal: '/logo.svg', fallback: null },
      favicon: { optimal: '/favicon.svg', fallback: '/favicon.ico' },
      appleTouchIcon: '/apple-touch-icon.png',
      androidChrome: { 192: null, 512: null },
      manifest: '/manifest.json',
      assets: ['/favicon.ico', '/favicon.svg', '/logo.svg', '/apple-touch-icon.png', '/icon-192x192.png', '/icon-512x512.png'],
    },
  },
};

/** The Next SSR render: the config is set, no window / document. */
function serverHtml(): string {
  vi.stubGlobal('window', undefined);
  vi.stubGlobal('document', undefined);
  try {
    return renderToString(<FaviconHead />);
  } finally {
    vi.unstubAllGlobals();
  }
}

// Regression: FaviconHead resolved the set in an effect, so the server HTML of every Next
// page held no favicon from the framework (crawlers, first paint)
describe('FaviconHead (Next)', () => {
  beforeEach(() => {
    favicon.config = { ...FAVICON_DEFAULTS, appName: 'Shop' };
    globalThis._DNDEV_CONFIG_ = CONFIG as unknown as typeof globalThis._DNDEV_CONFIG_;
    AssetResolver.clearCache();
  });
  afterEach(() => {
    delete (globalThis as { _DNDEV_CONFIG_?: unknown })._DNDEV_CONFIG_;
    AssetResolver.clearCache();
  });

  it('writes the favicon set into the server HTML, and the page hydrates', async () => {
    const html = serverHtml();
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>');
    expect(html).toContain('<link rel="icon" type="image/x-icon" href="/favicon.ico"/>');
    expect(html).toContain(
      '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>'
    );
    expect(html).toContain('<meta name="theme-color" content="#2563eb"/>');
    expect(html).not.toContain('data:,');
    expect(html).not.toContain('apple-mobile-web-app-status-bar-style');

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    const errors: unknown[] = [];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, <FaviconHead />, {
          onRecoverableError: (error) => errors.push(error),
        });
      });
      expect(errors).toEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
      // One favicon set in the document: the server's, kept by hydration
      expect(document.querySelectorAll('link[rel="icon"][type="image/svg+xml"]')).toHaveLength(1);
      expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
    } finally {
      consoleError.mockRestore();
      await act(async () => root?.unmount());
      container.remove();
    }
  });

  it('renders nothing with appConfig.favicon: false', () => {
    favicon.config = false;
    expect(serverHtml()).toBe('');
  });
});
