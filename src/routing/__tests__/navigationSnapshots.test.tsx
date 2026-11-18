import { act, cleanup, renderHook } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNavigationStore } from '@donotdev/core';
import type { AuthUser, NavigationRoute } from '@donotdev/core';

import { useNavigationItems } from '../useNavigation';
import { useAccessibleNavigationRoutes } from '../useRouteDiscovery';

const auth = vi.hoisted(() => ({ user: null as AuthUser | null }));
const translate = (key: string, options?: Record<string, unknown>) =>
  key === 'alpha:title' ? 'Alpha translated' : String(options?.defaultValue ?? key);

// Keep the actual public export chain and Zustand store, including its live getters.
vi.mock('@donotdev/core', async (importOriginal) => ({
  ...await importOriginal<typeof import('@donotdev/core')>(),
  useTranslation: () => ({ t: translate }),
}));
vi.mock('../../utils/useAuthSafe', () => ({ useAuthSafe: () => auth.user }));
vi.mock('@donotdev/ui/routing/hooks', () => ({ useRoutePath: () => '/zebra/child' }));

const hooks = [useNavigationItems, useAccessibleNavigationRoutes];
const paths = (routes: NavigationRoute[]) => routes.map((route) => route.path);

beforeEach(() => {
  auth.user = null;
  useNavigationStore.getState().setCacheData({
    allRoutes: [], filteredRoutes: new Map(), lastUpdated: 0,
  });
});
afterEach(cleanup);

describe.each(hooks)('%s snapshot ownership', (useRoutes) => {
  it('hydrates the initial snapshot after the real live store has initialized', async () => {
    const renders: string[][] = [];
    function Probe() {
      const routes = useRoutes();
      renders.push(paths(routes));
      return <span>{paths(routes).join(',')}</span>;
    }

    const html = renderToString(<Probe />);
    const initial = useNavigationStore.getInitialState();
    await useNavigationStore.getState().initialize({ routes: [{
      path: '/new-route', component: 'NewPage', importPath: '/NewPage.tsx', auth: false,
    }] });
    expect(initial.cache.allRoutes).toEqual([]);
    // Demonstrate the dangerous legacy getter is genuinely live, not a mock selector.
    expect(paths(initial.getFilteredRoutes({ authenticated: false, role: 'guest' })))
      .toEqual(['/new-route']);
    const cacheSize = useNavigationStore.getState().cache.filteredRoutes.size;
    expect(renderToString(<Probe />)).toBe(html);

    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    renders.length = 0;
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, <Probe />, {
          onRecoverableError: (error) => errors.push(error),
        });
      });
      expect(renders[0]).toEqual([]);
      expect(errors).toEqual([]);
      expect(container.textContent).toBe('/new-route');
      expect(useNavigationStore.getState().cache.filteredRoutes.size).toBe(cacheSize);
    } finally {
      await act(async () => root?.unmount());
      container.remove();
    }
  });

  it('updates on initialization and route replacement without an auth change', async () => {
    const { result } = renderHook(useRoutes);
    expect(result.current).toEqual([]);
    await act(async () => {
      await useNavigationStore.getState().initialize({ routes: [{
        path: '/first', component: 'FirstPage', importPath: '/FirstPage.tsx', auth: false,
      }] });
    });
    expect(paths(result.current)).toEqual(['/first']);
    act(() => {
      useNavigationStore.getState().invalidateCache();
      useNavigationStore.getState().setCacheData({
        allRoutes: [{ path: '/second', label: 'Second', auth: false }],
      });
    });
    expect(paths(result.current)).toEqual(['/second']);
    const stable = result.current;
    act(() => useNavigationStore.getState().setLoading(true));
    expect(result.current).toBe(stable);
    expect(useNavigationStore.getState().cache.filteredRoutes.size).toBe(0);
  });
});

it('preserves differing default roles and the two output mappings/orderings', () => {
  const routes: NavigationRoute[] = [
    { path: '/zebra', label: 'zebra', auth: false, external: true },
    { path: '/alpha', label: 'Original', auth: false, meta: { namespace: 'alpha' } },
    { path: '/role-only', label: 'Role only', auth: { role: 'user' } },
    { path: '/private', label: 'Private', auth: true },
    { path: '/hidden', label: 'Hidden', meta: { hideFromMenu: true } },
  ];
  useNavigationStore.getState().setCacheData({ allRoutes: routes });
  const items = renderHook(useNavigationItems);
  const accessible = renderHook(useAccessibleNavigationRoutes);
  expect(paths(items.result.current)).toEqual(['/alpha', '/zebra']);
  expect(items.result.current[0]?.label).toBe('Alpha translated');
  expect(items.result.current[1]).toMatchObject({
    external: true, isActive: true, hasChildren: false, children: undefined,
  });
  expect(accessible.result.current).toEqual([
    { path: '/zebra', label: 'zebra', icon: undefined, meta: undefined },
    { path: '/alpha', label: 'Original', icon: undefined, meta: routes[1]?.meta },
    { path: '/role-only', label: 'Role only', icon: undefined, meta: undefined },
  ]);

  auth.user = { id: 'user', role: 'user' };
  items.rerender();
  accessible.rerender();
  expect(paths(items.result.current)).toEqual(['/alpha', '/private', '/role-only', '/zebra']);
  expect(paths(accessible.result.current)).toEqual(['/zebra', '/alpha', '/role-only', '/private']);
});
