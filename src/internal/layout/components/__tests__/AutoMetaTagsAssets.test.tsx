// packages/ui/src/internal/layout/components/__tests__/AutoMetaTagsAssets.test.tsx

import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({ pathname: '/about' }));

vi.mock('@donotdev/core', async () => {
  const languagePath = await import(
    '../../../../../../core/utils/src/common/languagePath'
  );
  // AutoMetaTags builds its tags with these (shared with the Vite prerender)
  const headTags = await import(
    '../../../../../../core/utils/src/common/headTags'
  );
  const routeMatch = await import('../../../../../../core/utils/src/common/routeMatch');
  // The real environment and config reads
  const platform = await import(
    '../../../../../../core/utils/src/client/platformDetection'
  );
  const config = await import('../../../../../../core/utils/src/client/configUtils');
  return {
    ...languagePath,
    ...headTags,
    ...routeMatch,
    isClient: platform.isClient,
    getDndevConfig: config.getDndevConfig,
    isDev: () => false,
    isNextJs: () => true,
    getLanguageRouting: () => ({ languages: ['fr'], defaultLanguage: 'fr' }),
    // No record shown (layout store routeRecordLabel)
    useLayout: () => null,
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
    }),
    useSeoConfig: () => ({ siteName: 'Shop' }),
    // Links: the home page emits the Organization JSON-LD
    useAppConfig: () => ({
      name: 'Shop',
      links: { instagram: 'https://instagram.com/shop' },
    }),
    getPlatformEnvVar: () => 'https://shop.example',
    translateArray: () => [],
  };
});
vi.mock('@donotdev/ui/routing/hooks', () => ({
  useRoutePath: () => page.pathname,
  useUrlLanguage: () => 'fr',
}));
// Next: React 19 hoists the head tags, no react-helmet-async
vi.mock('../HeadTags', () => ({
  HeadTags: ({ children }: { children: unknown }) => <>{children}</>,
}));

import { SITE_LOGO_PATH } from '../../../../../../core/utils/src/common/headTags';
import { AutoMetaTags } from '../AutoMetaTags';

/** The Next asset config of an app with logo.svg, logo.png and the generated PWA icons. */
const CONFIG = {
  routes: {
    mapping: [
      { path: '/', meta: { namespace: 'home' } },
      { path: '/about', meta: { namespace: 'about' } },
    ],
    manifest: { hasBlogFeed: false },
  },
  assets: {
    mapping: {
      logo: { optimal: '/logo.png', fallback: '/logo.png' },
      favicon: { optimal: '/favicon.svg', fallback: '/favicon.ico' },
      appleTouchIcon: '/apple-touch-icon.png',
      androidChrome: { 192: null, 512: null },
      manifest: '/manifest.json',
      assets: ['/favicon.ico', '/favicon.svg', '/logo.svg', '/icon-192x192.png', '/icon-512x512.png', '/logo.png'],
    },
  },
};

/** The Next SSR render: the config is set, no window / document. */
function serverHtml(): string {
  vi.stubGlobal('window', undefined);
  vi.stubGlobal('document', undefined);
  try {
    return renderToString(<AutoMetaTags />);
  } finally {
    vi.unstubAllGlobals();
  }
}

/** Logo URLs of the page's JSON-LD: WebPage publisher, Organization. */
const jsonLdLogos = (root: ParentNode) =>
  [...root.querySelectorAll('script[type="application/ld+json"]')]
    .map((script) => JSON.parse(script.textContent ?? '{}'))
    .flatMap((data) =>
      data['@type'] === 'WebPage'
        ? [data.publisher.logo.url]
        : data['@type'] === 'Organization'
          ? [data.logo.url]
          : []
    );

// Regression: the server resolved the publisher logo without the asset manifest
// (/logo.svg), the browser with it (/icon-512x512.png): React discarded the server HTML
// of every page (shopkb, Next dev). The logo is SITE_LOGO_PATH, even when the manifest
// lists the generated PWA icons.
describe('AutoMetaTags JSON-LD logo', () => {
  beforeEach(() => {
    globalThis._DNDEV_CONFIG_ = CONFIG as unknown as typeof globalThis._DNDEV_CONFIG_;
  });
  afterEach(() => {
    delete (globalThis as { _DNDEV_CONFIG_?: unknown })._DNDEV_CONFIG_;
  });

  it.each([
    ['/about', 1],
    ['/', 2],
  ])('is /logo.svg on the server and in the browser at %s: the page hydrates', async (pathname, logos) => {
    page.pathname = pathname;
    const html = serverHtml();
    const container = document.createElement('div');
    container.innerHTML = html;
    const logo = `https://shop.example${SITE_LOGO_PATH}`;
    expect(SITE_LOGO_PATH).toBe('/logo.svg');
    expect(jsonLdLogos(container)).toEqual(Array(logos).fill(logo));
    document.body.append(container);
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, <AutoMetaTags />, {
          onRecoverableError: (error) => errors.push(error),
        });
      });
      expect(errors).toEqual([]);
      expect(jsonLdLogos(container)).toEqual(Array(logos).fill(logo));
    } finally {
      await act(async () => root?.unmount());
      container.remove();
    }
  });
});
