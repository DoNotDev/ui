import { renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

import { useNavigationStore } from '@donotdev/core';
import type { NavigationRoute } from '@donotdev/core';

import { useNavigationItems } from '../useNavigation';

// i18next stand-in: a page namespace's titles resolve only once that namespace was asked
// for (a build's lazy page namespaces load on demand), else the default value comes back.
const i18n = vi.hoisted(() => ({
  requested: [] as string[][],
  titles: { 'alpha:title': 'Alpha FR', 'beta:title': 'Bêta FR' } as Record<string, string>,
}));
vi.mock('@donotdev/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@donotdev/core')>()),
  useTranslation: (namespace: string | string[] = 'dndev') => {
    const namespaces = Array.isArray(namespace) ? namespace : [namespace];
    i18n.requested.push(namespaces);
    return {
      t: (key: string, options?: { defaultValue?: string }) => {
        const ns = key.split(':')[0] ?? '';
        return namespaces.includes(ns) && i18n.titles[key]
          ? i18n.titles[key]
          : String(options?.defaultValue ?? key);
      },
    };
  },
}));
vi.mock('../../utils/useAuthSafe', () => ({
  useAuthSafe: (key: string) =>
    key === 'can' ? { navigate: () => true } : null,
}));
vi.mock('@donotdev/ui/routing/hooks', () => ({ useRoutePath: () => '/missing' }));

beforeEach(() => {
  i18n.requested = [];
});

// Regression (shopkb admin, French UI): the 404 suggestions and menus read each route's
// `<namespace>:title` without loading those namespaces, so a build showed the English
// labels derived from the file names.
it('loads the routes page namespaces and labels each route in the UI language', () => {
  const routes: NavigationRoute[] = [
    { path: '/alpha', label: 'Alpha', auth: false, meta: { namespace: 'alpha' } },
    { path: '/beta', label: 'Beta', auth: false, meta: { namespace: 'beta' } },
    { path: '/beta-two', label: 'Beta two', auth: false, meta: { namespace: 'beta' } },
    { path: '/plain', label: 'Plain', auth: false },
  ];
  useNavigationStore.getState().setCacheData({ allRoutes: routes });
  const { result } = renderHook(useNavigationItems);
  expect(i18n.requested.at(-1)).toEqual(['dndev', 'alpha', 'beta']);
  expect(result.current.map((item) => item.label)).toEqual([
    'Alpha FR',
    'Bêta FR',
    'Bêta FR',
    'Plain',
  ]);
});
