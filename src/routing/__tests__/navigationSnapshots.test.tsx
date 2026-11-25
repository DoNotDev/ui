import { act, cleanup, renderHook } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNavigationStore } from '@donotdev/core';
import type { AuthUser, NavigationRoute } from '@donotdev/core';

import { useNavigationItems } from '../useNavigation';
import { useAccessibleNavigationRoutes } from '../useRouteDiscovery';

const auth = vi.hoisted(() => ({
  user: null as AuthUser | null,
  tier: 'free',
}));
const translate = (key: string, options?: Record<string, unknown>) =>
  key === 'alpha:title' ? 'Alpha translated' : String(options?.defaultValue ?? key);

// Keep the actual public export chain and Zustand store, including its live getters.
vi.mock('@donotdev/core', async (importOriginal) => ({
  ...await importOriginal<typeof import('@donotdev/core')>(),
  useTranslation: () => ({ t: translate }),
}));
// `can.navigate` stands in for the real rule: tier ranks free < pro, nothing else gated.
const TIERS = ['free', 'pro'];
const can = vi.hoisted(() => ({
  current: undefined as unknown,
}));
vi.mock('../../utils/useAuthSafe', () => ({
  useAuthSafe: (key: string) => {
    if (key !== 'can') return auth.user;
    // New identity per tier, as the real hook (rebuilt when the subscription changes).
    const tier = auth.tier;
    if ((can.current as { tier?: string } | undefined)?.tier !== tier) {
      can.current = {
        tier,
        navigate: (config: { tier?: string; role?: string }) =>
          config.role === undefined &&
          (!config.tier || TIERS.indexOf(tier) >= TIERS.indexOf(config.tier)),
      };
    }
    return can.current;
  },
}));
vi.mock('@donotdev/ui/routing/hooks', () => ({ useRoutePath: () => '/zebra/child' }));

const hooks = [useNavigationItems, useAccessibleNavigationRoutes];
const paths = (routes: NavigationRoute[]) => routes.map((route) => route.path);

beforeEach(() => {
  auth.user = null;
  auth.tier = 'free';
  useNavigationStore.getState().setCacheData({
    allRoutes: [], filteredRoutes: new Map(), lastUpdated: 0,
  });
});
afterEach(cleanup);

describe.each(hooks)('%s snapshot ownership', (useRoutes) => {
  // Regression (shop review): the routes reached the store only in an effect after mount,
  // so navigation was missing from the server HTML and popped in after hydration.
  it('renders the build-time routes on the server and in the hydration pass, unchanged by the store init', async () => {
    const mapping = [{
      path: '/new-route', component: 'NewPage', importPath: '/NewPage.tsx', auth: false,
    }];
    const previous = globalThis._DNDEV_CONFIG_;
    globalThis._DNDEV_CONFIG_ = { routes: { mapping } } as typeof globalThis._DNDEV_CONFIG_;
    const renders: string[][] = [];
    function Probe() {
      const routes = useRoutes();
      renders.push(paths(routes));
      return <span>{paths(routes).join(',')}</span>;
    }
    const container = document.createElement('div');
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      const html = renderToString(<Probe />);
      expect(html).toContain('/new-route');
      // The store's own initial state stays empty: the routes come from the config
      expect(useNavigationStore.getInitialState().cache.allRoutes).toEqual([]);

      container.innerHTML = html;
      document.body.append(container);
      renders.length = 0;
      const errors: unknown[] = [];
      await act(async () => {
        root = hydrateRoot(container, <Probe />, {
          onRecoverableError: (error) => errors.push(error),
        });
      });
      expect(renders[0]).toEqual(['/new-route']);
      expect(errors).toEqual([]);

      // The store initializes from the same mapping: same array, no re-render
      const before = renders.length;
      await act(async () => {
        await useNavigationStore.getState().initialize({ routes: mapping });
      });
      expect(container.textContent).toBe('/new-route');
      expect(renders.length).toBe(before);
    } finally {
      await act(async () => root?.unmount());
      container.remove();
      globalThis._DNDEV_CONFIG_ = previous;
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

it('gives both hooks one access rule (signed out = guest) and keeps their two output mappings/orderings', () => {
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
  ]);

  auth.user = { id: 'user', role: 'user' };
  items.rerender();
  accessible.rerender();
  expect(paths(items.result.current)).toEqual(['/alpha', '/private', '/role-only', '/zebra']);
  expect(paths(accessible.result.current)).toEqual(['/zebra', '/alpha', '/role-only', '/private']);
});

describe.each(hooks)('%s tier gate', (useRoutes) => {
  it('hides a tier-gated route without the tier and shows it with it', () => {
    useNavigationStore.getState().setCacheData({
      allRoutes: [
        { path: '/open', label: 'Open', auth: false },
        { path: '/pro', label: 'Pro', auth: { required: true, tier: 'pro' } },
        { path: '/guest', label: 'Guest', auth: { role: 'guest' } },
      ],
    });
    auth.user = { id: 'user', role: 'user' };
    const routes = renderHook(useRoutes);
    expect(paths(routes.result.current).sort()).toEqual(['/guest', '/open']);

    auth.tier = 'pro';
    routes.rerender();
    expect(paths(routes.result.current).sort()).toEqual(['/guest', '/open', '/pro']);
  });
});
