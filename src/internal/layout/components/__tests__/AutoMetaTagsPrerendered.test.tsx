// packages/ui/src/internal/layout/components/__tests__/AutoMetaTagsPrerendered.test.tsx

import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ICrudAdapter } from '@donotdev/core';

import { createSchemas } from '../../../../../../core/schemas/src/common/createSchema';
import { HIDDEN_STATUSES } from '../../../../../../core/schemas/src/common/visibility';
import {
  buildProductJsonLd,
  deriveEntitySeo,
} from '../../../../../../core/utils/src/common/entitySeo';
import * as headTags from '../../../../../../core/utils/src/common/headTags';
import * as languagePath from '../../../../../../core/utils/src/common/languagePath';
import {
  buildPrerenderedPages,
  recordRoutes,
} from '../../../../../../core/config/vite/buildPages.js';
import { entityReadSchemas } from '../../../../../../core/config/utils/entityRecordSeo.js';
import { productEntity } from '@dndev/test-entities';

const BASE = 'https://shop.example';
const FR_EN = { languages: ['fr', 'en'], defaultLanguage: 'fr' };
const MAPPING = [
  { path: '/about', meta: { namespace: 'about' } },
  {
    path: '/produits/:slug',
    meta: { namespace: 'product', entity: 'products', seo: { type: 'product' } },
  },
];
/** English translations, `ns:key` → text: the build and the browser read the same. */
const EN: Record<string, string> = {
  'about:title': 'About',
  'about:description': 'Who we are & "why"',
};
const t = (key: string, options?: { defaultValue?: string }) =>
  EN[key] ?? options?.defaultValue ?? key;
const page = vi.hoisted(() => ({ pathname: '/produits/serum' }));

vi.mock('@donotdev/core', async () => {
  const languagePath = await import(
    '../../../../../../core/utils/src/common/languagePath'
  );
  const headTags = await import('../../../../../../core/utils/src/common/headTags');
  // The route matcher AutoMetaTags shares with crud
  const routeMatch = await import('../../../../../../core/utils/src/common/routeMatch');
  return {
    ...languagePath,
    ...headTags,
    ...routeMatch,
    isNextJs: () => false,
    getLanguageRouting: () => ({ languages: ['fr', 'en'], defaultLanguage: 'fr' }),
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string }) =>
        ({ 'about:title': 'About', 'about:description': 'Who we are & "why"' })[key] ??
        options?.defaultValue ??
        key,
    }),
    getDndevConfig: () => ({
      routes: {
        mapping: [
          { path: '/about', meta: { namespace: 'about' } },
          {
            path: '/produits/:slug',
            meta: { namespace: 'product', entity: 'products', seo: { type: 'product' } },
          },
        ],
        manifest: { hasBlogFeed: false },
      },
    }),
    useSeoConfig: () => ({ siteName: 'Shop', defaultImage: '/og-image.png' }),
    useAppConfig: () => ({ name: 'Shop' }),
    getPlatformEnvVar: () => 'https://shop.example',
    translateArray: () => [],
  };
});
vi.mock('@donotdev/ui/routing/hooks', () => ({
  useRoutePath: () => page.pathname,
  useUrlLanguage: () => 'en',
}));

/** The `<head>` the Vite build writes for an English page. */
async function prerenderedHeadOf(file: string): Promise<string> {
  const crud = {
    query: vi.fn(async () => ({
      items: [
        {
          id: '1',
          slug: 'serum',
          name: 'Bakuchiol Serum',
          shortDescription: 'A gentle <b>retinol</b> & "clean" alternative.',
          images: [{ fullUrl: '/img/serum.jpg' }],
          rrpInclVat: 32,
          status: 'available',
        },
      ],
    })),
  } as unknown as ICrudAdapter;
  const { pages } = await buildPrerenderedPages({
    staticRoutes: [MAPPING[0]!],
    records: recordRoutes([MAPPING[1]!]),
    crud,
    readSchemas: entityReadSchemas(
      { productEntity },
      recordRoutes([MAPPING[1]!]).map(({ route }) => route),
      createSchemas
    ),
    core: {
      ...languagePath,
      ...headTags,
      deriveEntitySeo,
      buildProductJsonLd,
      HIDDEN_STATUSES,
    },
    entities: { productEntity },
    translate: () => t as never,
    routing: FR_EN,
    baseUrl: BASE,
    siteName: 'Shop',
    hreflang: true,
    defaultNamespace: 'home',
    defaultImage: '/og-image.png',
    shellHtml:
      '<html><head><title>Loading...</title></head><body><div id="root"></div></body></html>',
  });
  const html = pages.find((p) => p.file === file)!.html;
  return html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
}

/** Let react-helmet-async commit its (deferred) head update. */
const helmetCommit = () => new Promise((resolve) => setTimeout(resolve, 50));

const count = (selector: string) => document.head.querySelectorAll(selector).length;
const jsonLdTypes = () =>
  [...document.head.querySelectorAll('script[type="application/ld+json"]')].map(
    (script) => JSON.parse(script.textContent ?? '{}')['@type']
  );

/**
 * Loads a prerendered page's head, renders AutoMetaTags on its URL: every prerendered
 * node must stay (Helmet found an equal node), nothing duplicated.
 */
async function loadPrerendered(file: string, pathname: string) {
  vi.resetModules();
  document.head.innerHTML = await prerenderedHeadOf(file);
  const prerendered = [...document.head.querySelectorAll('[data-rh]')];
  const title = document.title;
  page.pathname = pathname;
  const { AutoMetaTags: Fresh } = await import('../AutoMetaTags');
  const view = render(
    <HelmetProvider>
      <Fresh />
    </HelmetProvider>
  );
  await helmetCommit();
  return { view, prerendered, title, Fresh };
}

describe('AutoMetaTags on a Vite prerendered page', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('record page: keeps every prerendered node, one BreadcrumbList (the record one)', async () => {
    const { view, prerendered, title, Fresh } = await loadPrerendered(
      '/en/produits/serum.html',
      '/produits/serum'
    );
    expect(prerendered.length).toBeGreaterThan(10);
    for (const node of prerendered) expect(node.isConnected).toBe(true);
    expect(document.title).toBe(title);
    expect(title).toBe('Bakuchiol Serum | Shop');
    expect(count('meta[name="description"]')).toBe(1);
    expect(count('meta[property="og:title"]')).toBe(1);
    expect(count('link[rel="canonical"]')).toBe(1);
    expect(count('link[hreflang]')).toBe(3);
    expect(jsonLdTypes().filter((type) => type === 'BreadcrumbList')).toHaveLength(1);
    expect(jsonLdTypes().filter((type) => type === 'Product')).toHaveLength(1);
    const breadcrumb = [...document.head.querySelectorAll('script[type="application/ld+json"]')]
      .map((script) => JSON.parse(script.textContent ?? '{}'))
      .find((item) => item['@type'] === 'BreadcrumbList');
    expect(breadcrumb.itemListElement.at(-1).name).toBe('Bakuchiol Serum');
    // Tags the build does not write (mobile) are added, not duplicated
    expect(count('meta[name="format-detection"]')).toBe(1);

    // Client navigation to another record: the route identity replaces the record's
    page.pathname = '/produits/other';
    view.rerender(
      <HelmetProvider>
        <Fresh />
      </HelmetProvider>
    );
    await helmetCommit();
    expect(document.title).not.toBe(title);
    expect(jsonLdTypes()).not.toContain('Product');
    expect(jsonLdTypes().filter((type) => type === 'BreadcrumbList')).toHaveLength(1);
    view.unmount();
  });

  it('static page: keeps every prerendered node; the route breadcrumb is added once', async () => {
    const { view, prerendered, title } = await loadPrerendered('/en/about.html', '/about');
    expect(title).toBe('About | Shop');
    for (const node of prerendered) expect(node.isConnected).toBe(true);
    expect(count('meta[name="description"]')).toBe(1);
    expect(count('meta[name="twitter:image"]')).toBe(1);
    expect(
      document.head.querySelector('meta[name="twitter:image"]')!.getAttribute('content')
    ).toBe(`${BASE}/og-image.png`);
    expect(count('link[rel="canonical"]')).toBe(1);
    expect(jsonLdTypes().filter((type) => type === 'WebPage')).toHaveLength(1);
    expect(jsonLdTypes().filter((type) => type === 'BreadcrumbList')).toHaveLength(1);
    view.unmount();
  });

  it('the browser derives the same identity tags as the build for that URL (client navigation)', async () => {
    vi.resetModules();
    document.head.innerHTML = ''; // no prerendered head: AutoMetaTags derives it
    page.pathname = '/about';
    const { AutoMetaTags: Fresh } = await import('../AutoMetaTags');
    const view = render(
      <HelmetProvider>
        <Fresh />
      </HelmetProvider>
    );
    await helmetCommit();
    const derived = document.head.innerHTML;
    view.unmount();

    document.head.innerHTML = await prerenderedHeadOf('/en/about.html');
    const built = [...document.head.querySelectorAll('[data-rh]')].map((node) => node.outerHTML);
    const derivedHead = document.createElement('head');
    derivedHead.innerHTML = derived;
    const derivedTags = new Set(
      [...derivedHead.querySelectorAll('[data-rh]')].map((node) => node.outerHTML)
    );
    for (const tag of built) expect(derivedTags).toContain(tag);
  });
});
