// packages/ui/src/routing/__tests__/parentRoute.test.ts

import { describe, expect, it, vi } from 'vitest';

vi.mock('@donotdev/core', async () =>
  import('../../../../core/utils/src/common/routeAncestors')
);

import { getParentRoutePath } from '../parentRoute';

const routes = [
  { path: '/' },
  { path: '/routines' },
  { path: '/routines/:id' },
  { path: '/fournisseur' },
  { path: '/reglages' },
  { path: '/catalogue' },
  { path: '/produits/:slug', meta: { parent: '/catalogue' } },
];

describe('getParentRoutePath', () => {
  it('returns the nearest parent that is a known route', () => {
    expect(getParentRoutePath('/routines/abc', routes)).toBe('/routines');
    expect(getParentRoutePath('/routines/new', routes)).toBe('/routines');
  });

  it('skips parents that are not routes', () => {
    expect(getParentRoutePath('/fournisseur/abc/reception', routes)).toBe('/fournisseur');
  });

  // REGRESSION (BUGS #35): no page at /produits, forms went back to home
  it("returns the page's PageMeta parent when its URL prefix is no route", () => {
    expect(getParentRoutePath('/produits/serum', routes)).toBe('/catalogue');
  });

  it('falls back to home for top-level pages', () => {
    expect(getParentRoutePath('/reglages', routes)).toBe('/');
    expect(getParentRoutePath('/unknown/x', routes, '/home')).toBe('/home');
  });
});
