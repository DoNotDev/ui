// packages/ui/src/routing/hooks/__tests__/languageRouting.next.test.tsx

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({
  pathname: '/',
  search: '',
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
}));
const routing = vi.hoisted(() => ({
  value: { languages: ['fr', 'en'], defaultLanguage: 'fr' },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({
    push: nav.push,
    replace: nav.replace,
    prefetch: nav.prefetch,
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}));
vi.mock('@donotdev/core', async () => {
  const languagePath =
    await import('../../../../../core/utils/src/common/languagePath');
  return {
    ...languagePath,
    getLanguageRouting: () => routing.value,
    isClient: () => true,
    useOverlayStore: (select: (s: { closeAll: () => void }) => unknown) =>
      select({ closeAll: () => {} }),
  };
});

import { useLocation } from '../useLocation.next';
import { useMatch } from '../useMatch.next';
import { useNavigate, usePrefetch } from '../useNavigate.next';
import { useRoutePath } from '../useRoutePath.next';
import { useLocalizedPath, useUrlLanguage } from '../useUrlLanguage.next';

beforeEach(() => {
  nav.pathname = '/';
  nav.search = '';
  nav.push.mockReset();
  nav.prefetch.mockReset();
  routing.value = { languages: ['fr', 'en'], defaultLanguage: 'fr' };
});

describe('Next routing with a language prefix', () => {
  it('useLocation strips the prefix: route matching sees app paths', () => {
    nav.pathname = '/en/produits/serum';
    expect(renderHook(() => useLocation()).result.current.pathname).toBe(
      '/produits/serum'
    );
    expect(renderHook(() => useUrlLanguage()).result.current).toBe('en');
    expect(
      renderHook(() => useMatch('/produits/:slug')).result.current?.params
    ).toEqual({ slug: 'serum' });
  });

  it('a rewritten default-language page reads like its browser URL', () => {
    // Server: /fr/produits (proxy rewrite); browser: /produits
    nav.pathname = '/fr/produits';
    const server = renderHook(() => useLocation()).result.current.pathname;
    const serverLang = renderHook(() => useUrlLanguage()).result.current;
    nav.pathname = '/produits';
    expect(renderHook(() => useLocation()).result.current.pathname).toBe(
      server
    );
    expect(renderHook(() => useUrlLanguage()).result.current).toBe(serverLang);
  });

  it('a per-request page (internal dndev-session tree) reads like its browser URL', () => {
    // Server: /fr/dndev-session/produits (proxy rewrite, auth cookie); browser: /produits
    nav.pathname = '/fr/dndev-session/produits';
    expect(renderHook(() => useRoutePath()).result.current).toBe('/produits');
    expect(renderHook(() => useUrlLanguage()).result.current).toBe('fr');
    nav.pathname = '/en/dndev-session';
    expect(renderHook(() => useRoutePath()).result.current).toBe('/');
    expect(renderHook(() => useUrlLanguage()).result.current).toBe('en');
    routing.value = { languages: ['fr'], defaultLanguage: 'fr' };
    nav.pathname = '/dndev-session';
    expect(renderHook(() => useLocation()).result.current.pathname).toBe('/');
    nav.pathname = '/dndev-session/produits';
    expect(renderHook(() => useRoutePath()).result.current).toBe('/produits');
  });

  it('useRoutePath reads the path without the query string', () => {
    nav.pathname = '/en/produits';
    nav.search = 'page=2';
    expect(renderHook(() => useRoutePath()).result.current).toBe('/produits');
  });

  it('useLocation keeps the query string', () => {
    nav.pathname = '/en/produits';
    nav.search = 'page=2';
    expect(renderHook(() => useLocation()).result.current).toMatchObject({
      pathname: '/produits',
      search: '?page=2',
    });
  });

  it('navigate and prefetch add the current language prefix', () => {
    nav.pathname = '/en/catalogue';
    const navigate = renderHook(() => useNavigate()).result.current;
    navigate('/produits/serum');
    expect(nav.push).toHaveBeenCalledWith('/en/produits/serum');
    renderHook(() => usePrefetch()).result.current('/marques');
    expect(nav.prefetch).toHaveBeenCalledWith('/en/marques');
  });

  it('keeps default-language and one-language URLs unprefixed', () => {
    nav.pathname = '/catalogue';
    renderHook(() => useNavigate()).result.current('/produits');
    expect(nav.push).toHaveBeenCalledWith('/produits');

    routing.value = { languages: ['fr'], defaultLanguage: 'fr' };
    nav.pathname = '/en/x';
    expect(renderHook(() => useLocation()).result.current.pathname).toBe(
      '/en/x'
    );
    expect(renderHook(() => useLocalizedPath()).result.current('/p')).toBe(
      '/p'
    );
  });
});
