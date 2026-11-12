// packages/ui/src/internal/layout/components/__tests__/AutoMetaTagsLanguages.test.tsx

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({
  pathname: '/produits',
  language: 'en',
  routing: { languages: ['fr', 'en'], defaultLanguage: 'fr' },
}));

vi.mock('@donotdev/core', async () => {
  const languagePath = await import(
    '../../../../../../core/utils/src/common/languagePath'
  );
  return {
    ...languagePath,
    getLanguageRouting: () => page.routing,
    isNextJs: () => true,
    useTranslation: () => ({ t: () => '' }),
    getDndevConfig: () => ({ routes: { mapping: [] } }),
    useSeoConfig: () => ({ siteName: 'Shop' }),
    useAppConfig: () => ({ name: 'Shop' }),
    getPlatformEnvVar: () => 'https://shop.example',
    translateArray: () => [],
  };
});
vi.mock('@donotdev/ui', () => ({
  AssetResolver: { assetExists: () => false },
}));
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
});
