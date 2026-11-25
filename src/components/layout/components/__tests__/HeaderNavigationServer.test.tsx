// packages/ui/src/components/layout/components/__tests__/HeaderNavigationServer.test.tsx

import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNavigationStore } from '@donotdev/core';
import type { AuthUser } from '@donotdev/core';

import HeaderNavigation from '../header/HeaderNavigation';

// The auth the server render reads: the request's session snapshot (useAuth serves it
// while the provider initializes). Stand-in: a user and its tier.
const auth = vi.hoisted(() => ({
  user: null as AuthUser | null,
  tier: 'free',
}));
vi.mock('../../../../utils/useAuthSafe', () => ({
  useAuthSafe: (key: string) =>
    key === 'can'
      ? {
          navigate: ({ tier }: { tier?: string }) =>
            !tier || (auth.user !== null && auth.tier === tier),
        }
      : auth.user,
}));
vi.mock('@donotdev/ui/routing/hooks', () => ({ useRoutePath: () => '/' }));
vi.mock('../../../../routing/Link', () => ({
  Link: ({ path, children, ...props }: { path: string; children?: unknown }) => (
    <a href={path} {...props}>
      {children as never}
    </a>
  ),
}));
vi.mock('@donotdev/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@donotdev/core')>()),
  useBreakpoint: () => false,
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      key === 'catalogue:title' ? 'Catalogue' : String(options?.defaultValue ?? ''),
  }),
}));

const mapping = [
  {
    path: '/catalogue',
    component: 'CataloguePage',
    importPath: '/CataloguePage.tsx',
    auth: { required: true, tier: 'pro' },
    meta: { namespace: 'catalogue', title: 'Catalogue' },
  },
];
let previous: typeof globalThis._DNDEV_CONFIG_;

beforeEach(() => {
  previous = globalThis._DNDEV_CONFIG_;
  globalThis._DNDEV_CONFIG_ = { routes: { mapping } } as typeof globalThis._DNDEV_CONFIG_;
  // Store not initialized: the server render (its initializer runs in an effect)
  useNavigationStore.getState().setCacheData({
    allRoutes: [],
    filteredRoutes: new Map(),
    lastUpdated: 0,
  });
  auth.user = null;
  auth.tier = 'free';
});
afterEach(() => {
  globalThis._DNDEV_CONFIG_ = previous;
});

// Regression (shop review): the header's Catalogue link rendered null on the server and
// popped in after hydration (routes reached the store in an effect).
describe('HeaderNavigation in the server render', () => {
  it('renders a tier-gated link for a visitor whose session has the tier', () => {
    auth.user = { id: 'u1', role: 'user' } as AuthUser;
    auth.tier = 'pro';
    const html = renderToString(<HeaderNavigation path="/catalogue" />);
    expect(html).toContain('href="/catalogue"');
    expect(html).toContain('Catalogue');
  });

  it('renders nothing for a signed-out visitor', () => {
    expect(renderToString(<HeaderNavigation path="/catalogue" />)).toBe('');
  });
});
