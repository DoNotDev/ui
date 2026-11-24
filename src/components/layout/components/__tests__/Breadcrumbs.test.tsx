// packages/ui/src/components/layout/components/__tests__/Breadcrumbs.test.tsx

import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const ID = 'ee8ba791-06ac-4c2d-9f3a-1b2c3d4e5f60';
const state = vi.hoisted(() => ({
  pathname: '/',
  recordLabel: null as { id: string; label: string } | null,
  namespaces: [] as unknown,
}));

const { TEXTS, ROUTES } = vi.hoisted(() => ({
  /** Translations `ns:key` → text; missing → the default (the i18next contract). */
  TEXTS: {
    'catalogue:title': 'Catalogue',
    'product:title': 'Produit',
    'products:title': 'Products',
    'navigation.home': 'Home',
  } as Record<string, string>,
  ROUTES: [
    { path: '/', meta: { namespace: 'home' } },
    { path: '/catalogue', meta: { namespace: 'catalogue' } },
    { path: '/produits/:slug', meta: { namespace: 'product', parent: '/catalogue' } },
    { path: '/products', meta: { namespace: 'products' } },
    { path: '/products/:id', meta: { seo: { title: 'Product' } } },
  ],
}));

vi.mock('@donotdev/core', async () => {
  // The trail is built with these (shared with the BreadcrumbList JSON-LD)
  const headTags = await import('../../../../../../core/utils/src/common/headTags');
  const routeMatch = await import('../../../../../../core/utils/src/common/routeMatch');
  const routeAncestors = await import(
    '../../../../../../core/utils/src/common/routeAncestors'
  );
  return {
    ...headTags,
    ...routeMatch,
    ...routeAncestors,
    getRoutes: () => ROUTES,
    useTranslation: (namespaces: unknown) => {
      state.namespaces = namespaces;
      return {
        t: (key: string, options?: string | { defaultValue?: string }) =>
          TEXTS[key] ?? (typeof options === 'string' ? options : options?.defaultValue) ?? key,
      };
    },
    useLayout: (key: string) =>
      key === 'routeRecordLabel' ? state.recordLabel : undefined,
    useSeoConfig: () => ({ siteName: 'Shop', defaultNamespace: 'home' }),
    useAppConfig: () => ({ name: 'Shop' }),
  };
});
vi.mock('@donotdev/components', () => ({
  cn: (...c: unknown[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@donotdev/ui/routing/hooks', () => ({
  useRoutePath: () => state.pathname,
}));
vi.mock('../../../../routing/Link', () => ({
  Link: ({ path, children }: { path: string; children: unknown }) => (
    <a href={path}>{children as string}</a>
  ),
}));

import { NotFoundDocument } from '../../../../routing/NotFoundDocument';
import Breadcrumbs from '../Breadcrumbs';

const trail = (pathname: string) => {
  state.pathname = pathname;
  return renderToStaticMarkup(<Breadcrumbs />);
};

describe('Breadcrumbs trail: ancestors named by their route titles', () => {
  beforeEach(() => {
    state.recordLabel = null;
  });

  // REGRESSION (BUGS #35): /produits/serum read Home > Produits (no page there) > Serum
  it('links the PageMeta parent by its title and drops the URL prefix that is no page', () => {
    const html = trail('/produits/serum');
    expect(html).toContain('<a href="/">Home</a>');
    expect(html).toContain('<a href="/catalogue">Catalogue</a>');
    expect(html).toContain('<span class="breadcrumb-label">Produit</span>');
    expect(html).not.toContain('Produits');
    expect(html).not.toContain('Serum');
    // The labels' namespaces load with the trail (lazy page namespaces)
    expect(state.namespaces).toEqual(['dndev', 'catalogue', 'product']);
  });

  it('renders the same trail on the server and in the hydration pass', () => {
    state.pathname = '/produits/serum';
    expect(renderToString(<Breadcrumbs />)).toBe(renderToString(<Breadcrumbs />));
  });

  it("shows the record's name instead of its id", () => {
    state.recordLabel = { id: ID, label: 'Bakuchiol Cream' };
    const html = trail(`/products/${ID}`);
    expect(html).toContain('<a href="/products">Products</a>');
    expect(html).toContain('Bakuchiol Cream');
    expect(html).not.toContain('Ee8ba791');
  });

  it("names the page by its route's title when no record label is set (never the slug)", () => {
    const html = trail(`/products/${ID}`);
    expect(html).toContain('<span class="breadcrumb-label">Product</span>');
    expect(html).not.toContain('Ee8ba791');
  });
});

// Regression: the static 404 (built at /_not-found) is served at any URL; a trail from
// a 2+ segment URL rendered only in the browser (React #418 on apps/next /foo/bar)
describe('Breadcrumbs in the 404 document', () => {
  it('renders no generated trail', () => {
    state.pathname = '/foo/bar';
    const html = renderToStaticMarkup(
      <NotFoundDocument>
        <Breadcrumbs />
      </NotFoundDocument>
    );
    expect(html).toBe('');
  });

  it('keeps explicit items', () => {
    const html = renderToStaticMarkup(
      <NotFoundDocument>
        <Breadcrumbs items={[{ label: 'Docs', href: '/docs' }, { label: 'Here' }]} />
      </NotFoundDocument>
    );
    expect(html).toContain('Docs');
  });
});
