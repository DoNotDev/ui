// packages/ui/src/internal/layout/components/__tests__/AutoMetaTagsRoutes.test.tsx

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({
  pathname: '/',
  mapping: [] as Array<{
    path: string;
    meta: Record<string, unknown>;
    auth?: unknown;
  }>,
  serverMetadataPaths: undefined as string[] | undefined,
  // Layout store routeRecordLabel: the record the page names (useRecordBreadcrumb)
  recordLabel: null as { id: string; label: string } | null,
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
    getLanguageRouting: () => ({ languages: ['fr'], defaultLanguage: 'fr' }),
    useLayout: (key: string) => (key === 'routeRecordLabel' ? page.recordLabel : undefined),
    useTranslation: () => ({ t: () => '' }),
    getDndevConfig: () => ({
      routes: {
        mapping: page.mapping,
        manifest: { hasBlogFeed: false, serverMetadataPaths: page.serverMetadataPaths },
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
  useUrlLanguage: () => 'fr',
}));
vi.mock('../HeadTags', () => ({
  HeadTags: ({ children }: { children: unknown }) => <>{children}</>,
}));

import { AutoMetaTags } from '../AutoMetaTags';

/** A route whose PageMeta sets a full title, to see which route the head resolved. */
const route = (path: string) => ({ path, meta: { seo: { fullTitle: path } } });

const titleAt = (pathname: string) => {
  page.pathname = pathname;
  return renderToStaticMarkup(<AutoMetaTags />).match(/<title>([^<]*)<\/title>/)?.[1];
};

describe('AutoMetaTags: catch-all (`*`) routes', () => {
  beforeEach(() => {
    page.serverMetadataPaths = undefined;
    page.mapping = [
      route('/docs/*'),
      route('/docs/api/*'),
      route('/docs/:section'),
      route('/docs/guide'),
      route('/shop/:id/*'),
    ];
  });

  it('resolves the PageMeta of the catch-all route under its prefix', () => {
    expect(titleAt('/docs/a/b')).toBe('/docs/*');
    expect(titleAt('/shop/42/reviews/1')).toBe('/shop/:id/*');
  });

  it('prefers the longest matching prefix', () => {
    expect(titleAt('/docs/api/users/1')).toBe('/docs/api/*');
  });

  it('keeps Next precedence: exact path, then `:param`, then catch-all', () => {
    expect(titleAt('/docs/guide')).toBe('/docs/guide');
    expect(titleAt('/docs/intro')).toBe('/docs/:section');
  });

  it('emits no identity on the routes whose page sets it on the server (manifest serverMetadataPaths)', () => {
    page.serverMetadataPaths = ['/docs/*', '/docs/:section'];
    expect(titleAt('/docs/a/b')).toBeUndefined();
    expect(titleAt('/docs/intro')).toBeUndefined();
    // Static and other dynamic routes keep their PageMeta identity
    expect(titleAt('/docs/guide')).toBe('/docs/guide');
    expect(titleAt('/shop/42/reviews')).toBe('/shop/:id/*');
  });

  it('gives dynamic routes without server metadata their PageMeta identity (Vite: always)', () => {
    expect(titleAt('/docs/intro')).toBe('/docs/:section');
    expect(titleAt('/docs/a/b')).toBe('/docs/*');
  });

  it('outside every pattern: no route metadata', () => {
    expect(titleAt('/other/a')).toBe('Shop');
  });
});

describe('AutoMetaTags: robots', () => {
  const robotsAt = (pathname: string) => {
    page.pathname = pathname;
    return renderToStaticMarkup(<AutoMetaTags />).match(
      /<meta name="robots" content="([^"]*)"/
    )?.[1];
  };

  beforeEach(() => {
    page.serverMetadataPaths = undefined;
    page.mapping = [
      { path: '/', meta: {}, auth: false },
      { path: '/compte', meta: {}, auth: { required: true } },
      { path: '/admin/:id', meta: {}, auth: { required: true, role: 'admin' } },
      { path: '/espace-pro', meta: { seo: { noindex: false } }, auth: true },
      { path: '/brouillon', meta: { seo: { noindex: true } }, auth: false },
    ];
  });

  it('auth-only pages are noindex by default (robots.txt no longer blocks them)', () => {
    expect(robotsAt('/compte')).toBe('noindex');
    expect(robotsAt('/admin/42')).toBe('noindex');
  });

  it('seo.noindex: false opts a page back in; seo.noindex: true keeps noindex, nofollow', () => {
    expect(robotsAt('/espace-pro')).toBeUndefined();
    expect(robotsAt('/brouillon')).toBe('noindex, nofollow');
  });

  it('public pages carry no robots tag', () => {
    expect(robotsAt('/')).toBeUndefined();
  });
});

describe('AutoMetaTags: record named by its page (useRecordBreadcrumb)', () => {
  beforeEach(() => {
    page.serverMetadataPaths = undefined;
    page.recordLabel = null;
    page.mapping = [
      // Private entity page: no server metadata, no namespace title
      { path: '/produits/:slug', meta: { namespace: 'product' }, auth: { required: true } },
      { path: '/fiches/:slug', meta: { seo: { fullTitle: 'Fiche' } } },
    ];
  });

  it('titles the page `<record name> | <site name>` when the URL names the record', () => {
    expect(titleAt('/produits/serum')).toBe('Shop');
    page.recordLabel = { id: 'crème', label: 'Crème Riche' };
    expect(titleAt('/produits/cr%C3%A8me')).toBe('Crème Riche | Shop');
  });

  it('never reads the label of another record (previous page)', () => {
    page.recordLabel = { id: 'serum', label: 'Sérum' };
    expect(titleAt('/produits/creme')).toBe('Shop');
  });

  it('leaves the identity to the server on serverMetadataPaths routes', () => {
    page.serverMetadataPaths = ['/produits/:slug'];
    page.recordLabel = { id: 'serum', label: 'Sérum' };
    expect(titleAt('/produits/serum')).toBeUndefined();
  });

  it("keeps the page's own seo.fullTitle", () => {
    page.recordLabel = { id: 'a', label: 'A' };
    expect(titleAt('/fiches/a')).toBe('Fiche');
  });
});
