// packages/ui/src/internal/layout/components/__tests__/AutoMetaTagsLanguages.test.tsx

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({
  pathname: '/produits',
  language: 'en',
  routing: { languages: ['fr', 'en'], defaultLanguage: 'fr' },
  hasBlogFeed: false,
  trailingSlash: false,
}));

vi.mock('@donotdev/core', async () => {
  const languagePath = await import(
    '../../../../../../core/utils/src/common/languagePath'
  );
  // AutoMetaTags builds its tags with these (shared with the Vite prerender)
  const headTags = await import(
    '../../../../../../core/utils/src/common/headTags'
  );
  // The route matcher AutoMetaTags shares with crud
  const routeMatch = await import('../../../../../../core/utils/src/common/routeMatch');
  return {
    ...languagePath,
    ...headTags,
    ...routeMatch,
    getLanguageRouting: () => page.routing,
    isNextJs: () => true,
    // No record shown (layout store routeRecordLabel)
    useLayout: () => null,
    useTranslation: () => ({ t: () => '' }),
    getDndevConfig: () => ({
      routes: {
        // The page the tests render: its BreadcrumbList item (a URL that is no page has none)
        mapping: [{ path: '/produits', meta: {} }],
        manifest: {
          hasBlogFeed: page.hasBlogFeed,
          trailingSlash: page.trailingSlash,
        },
      },
    }),
    useSeoConfig: () => ({ siteName: 'Shop' }),
    useAppConfig: () => ({ name: 'Shop' }),
    getPlatformEnvVar: () => 'https://shop.example',
    translateArray: () => [],
  };
});
vi.mock('@donotdev/ui/routing/hooks', () => ({
  useRoutePath: () => page.pathname,
  useUrlLanguage: () => page.language,
}));
vi.mock('../HeadTags', () => ({
  HeadTags: ({ children }: { children: unknown }) => <>{children}</>,
}));

import { AutoMetaTags } from '../AutoMetaTags';

const linkHref = (html: string, attrs: string) =>
  html.match(new RegExp(`<link ${attrs} href="([^"]*)"`))?.[1];

describe('AutoMetaTags: one URL per language', () => {
  beforeEach(() => {
    page.pathname = '/produits';
    page.language = 'en';
    page.routing = { languages: ['fr', 'en'], defaultLanguage: 'fr' };
    page.hasBlogFeed = false;
    page.trailingSlash = false;
  });

  it('canonical is the page in its own language', () => {
    const html = renderToStaticMarkup(<AutoMetaTags />);
    expect(linkHref(html, 'rel="canonical"')).toBe(
      'https://shop.example/en/produits'
    );
    page.language = 'fr';
    expect(linkHref(renderToStaticMarkup(<AutoMetaTags />), 'rel="canonical"')).toBe(
      'https://shop.example/produits'
    );
  });

  it('hreflang lists every language URL, x-default the root one', () => {
    const html = renderToStaticMarkup(<AutoMetaTags />);
    expect(linkHref(html, 'rel="alternate" hrefLang="fr"')).toBe(
      'https://shop.example/produits'
    );
    expect(linkHref(html, 'rel="alternate" hrefLang="en"')).toBe(
      'https://shop.example/en/produits'
    );
    expect(linkHref(html, 'rel="alternate" hrefLang="x-default"')).toBe(
      'https://shop.example/produits'
    );
  });

  it('one language: no hreflang, unprefixed canonical', () => {
    page.routing = { languages: ['fr'], defaultLanguage: 'fr' };
    page.language = 'fr';
    const html = renderToStaticMarkup(<AutoMetaTags />);
    expect(html).not.toContain('hrefLang');
    expect(linkHref(html, 'rel="canonical"')).toBe('https://shop.example/produits');
  });

  it('publisher logo in JSON-LD is an absolute URL', () => {
    const html = renderToStaticMarkup(<AutoMetaTags />);
    expect(html).toContain(
      '"logo":{"@type":"ImageObject","url":"https://shop.example/logo.svg"}'
    );
  });

  it('no RSS link when the app has no blog feed', () => {
    const html = renderToStaticMarkup(<AutoMetaTags />);
    expect(html).not.toContain('application/rss+xml');
  });

  it('RSS link when the app has a blog feed', () => {
    page.hasBlogFeed = true;
    const html = renderToStaticMarkup(<AutoMetaTags />);
    expect(html).toContain('type="application/rss+xml"');
    expect(html).toContain('href="https://shop.example/rss.xml"');
  });

  it('trailingSlash: canonical, og:url, hreflang and JSON-LD URLs end with `/`', () => {
    page.trailingSlash = true;
    page.pathname = '/';
    const home = renderToStaticMarkup(<AutoMetaTags />);
    expect(linkHref(home, 'rel="canonical"')).toBe('https://shop.example/en/');
    expect(home).toContain('<meta property="og:url" content="https://shop.example/en/"/>');
    expect(linkHref(home, 'rel="alternate" hrefLang="fr"')).toBe('https://shop.example/');
    expect(linkHref(home, 'rel="alternate" hrefLang="en"')).toBe('https://shop.example/en/');

    page.pathname = '/produits';
    const html = renderToStaticMarkup(<AutoMetaTags />);
    expect(linkHref(html, 'rel="canonical"')).toBe('https://shop.example/en/produits/');
    expect(linkHref(html, 'rel="alternate" hrefLang="fr"')).toBe(
      'https://shop.example/produits/'
    );
    expect(html).toContain('"url":"https://shop.example/en/produits/"');
    expect(html).toContain('"item":"https://shop.example/en/"');
    expect(html).toContain('"item":"https://shop.example/en/produits/"');
  });

  it('no trailingSlash: URLs keep the route form (FR home at the root, /en without slash)', () => {
    page.pathname = '/';
    const home = renderToStaticMarkup(<AutoMetaTags />);
    expect(linkHref(home, 'rel="canonical"')).toBe('https://shop.example/en');
  });

  it('WebSite JSON-LD keeps name and url, with no potentialAction / SearchAction', () => {
    page.pathname = '/';
    const home = renderToStaticMarkup(<AutoMetaTags />);
    const blocks = [...home.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(
      (m) => JSON.parse(m[1].replace(/&quot;/g, '"'))
    );
    const site = blocks.find((b) => b['@type'] === 'WebSite');
    expect(site).toBeDefined();
    expect(site.url).toBe('https://shop.example');
    expect(site).not.toHaveProperty('potentialAction');
    expect(home).not.toContain('SearchAction');
    expect(home).not.toContain('search_term_string');
  });
});
