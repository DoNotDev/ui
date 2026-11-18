// packages/ui/src/routing/__tests__/parentRoute.test.ts

import { describe, expect, it } from 'vitest';

import { getParentRoutePath, getPathPrefixes } from '../parentRoute';

const routes = new Set(['/', '/routines', '/routines/:id', '/fournisseur', '/reglages']);

describe('breadcrumb path rules', () => {
  it('lists cumulative prefixes', () => {
    expect(getPathPrefixes('/a/b/c')).toEqual(['/a', '/a/b', '/a/b/c']);
    expect(getPathPrefixes('/')).toEqual([]);
  });

  it('returns the nearest parent that is a known route', () => {
    expect(getParentRoutePath('/routines/abc', routes)).toBe('/routines');
    expect(getParentRoutePath('/routines/new', routes)).toBe('/routines');
  });

  it('skips parents that are not routes', () => {
    expect(getParentRoutePath('/fournisseur/abc/reception', routes)).toBe('/fournisseur');
  });

  it('falls back to home for top-level pages', () => {
    expect(getParentRoutePath('/reglages', routes)).toBe('/');
    expect(getParentRoutePath('/unknown/x', routes, '/home')).toBe('/home');
  });
});
