// packages/ui/src/internal/layout/components/__tests__/AutoMetaTagsBreadcrumb.test.tsx

import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({
  pathname: '/',
  namespaces: [] as unknown,
  /** Translations `ns:key` → text; missing → the default (the i18next contract). */
  texts: {
    'catalogue:title': 'Catalogue',
    'aide:title': 'Aide',
    'livraison:title': 'Livraison',
  } as Record<string, string>,
  mapping: [
    { path: '/', meta: { namespace: 'home' } },
    { path: '/catalogue', meta: { namespace: 'catalogue' } },
    { path: '/aide', meta: { namespace: 'aide' } },
    // No /conditions page: the parent is declared
    { path: '/conditions/livraison', meta: { namespace: 'livraison', parent: '/aide' } },
    {
      path: '/produits/:slug',
      meta: { namespace: 'product', entity: 'products', parent: '/catalogue' },
    },
  ],
}));

vi.mock('@donotdev/core', async () => {
  const languagePath = await import('../../../../../../core/utils/src/common/languagePath');
  // AutoMetaTags builds its tags with these (shared with the Vite prerender)
  const headTags = await import('../../../../../../core/utils/src/common/headTags');
  const routeMatch = await import('../../../../../../core/utils/src/common/routeMatch');
  return {
    ...languagePath,
    ...headTags,
    ...routeMatch,
    getLanguageRouting: () => ({ languages: ['fr'], defaultLanguage: 'fr' }),
    useTranslation: (namespaces: unknown) => {
      page.namespaces = namespaces;
      return {
        t: (key: string, options?: { defaultValue?: string }) =>
          page.texts[key] ?? options?.defaultValue ?? key,
      };
    },
    getDndevConfig: () => ({
      routes: {
        mapping: page.mapping,
        manifest: { hasBlogFeed: false, recordBreadcrumbPaths: ['/produits/:slug'] },
      },
    }),
    useSeoConfig: () => ({ siteName: 'Shop', defaultNamespace: 'home' }),
    useAppConfig: () => ({ name: 'Shop' }),
    getPlatformEnvVar: () => 'https://shop.example',
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

/** BreadcrumbList items of the server HTML at a path: [position, name, url]. */
const serverBreadcrumb = (pathname: string) => {
  page.pathname = pathname;
  const html = renderToString(<AutoMetaTags />);
  const lists = [...html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)]
    .map((match) => JSON.parse(match[1]!.replace(/&quot;/g, '"')))
    .filter((jsonLd) => jsonLd['@type'] === 'BreadcrumbList');
  return lists.map((list) =>
    list.itemListElement.map(
      ({ position, name, item }: { position: number; name: string; item: string }) => [
        position,
        name,
        item,
      ]
    )
  );
};

describe('AutoMetaTags BreadcrumbList: the ancestor chain, in the server HTML', () => {
  // REGRESSION (BUGS #35): the list named the URL prefix (/conditions, no page) by its slug
  it('home, the declared parent by its title, the page by its title', () => {
    expect(serverBreadcrumb('/conditions/livraison')).toEqual([
      [
        [1, 'Shop', 'https://shop.example/'],
        [2, 'Aide', 'https://shop.example/aide'],
        [3, 'Livraison', 'https://shop.example/conditions/livraison'],
      ],
    ]);
    // The ancestors' namespaces load with the page's (lazy page namespaces)
    expect(page.namespaces).toEqual(['dndev', 'aide', 'livraison']);
  });

  it('server render = hydration render (no client-only effect)', () => {
    page.pathname = '/conditions/livraison';
    expect(renderToString(<AutoMetaTags />)).toBe(renderToString(<AutoMetaTags />));
  });

  it('emits none on an entity record page (the generated page renders its own)', () => {
    expect(serverBreadcrumb('/produits/serum')).toEqual([]);
  });
});
