// packages/ui/src/vite-routing/__tests__/notFoundRoute.test.tsx

import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@donotdev/components', () => ({ Spinner: () => null }));
vi.mock('@donotdev/core', () => ({
  applyFirstVisitLanguage: () => undefined,
  getLanguageRouting: () => ({ languages: ['en'], defaultLanguage: 'en' }),
  splitLanguagePath: (path: string) => ({ language: null, path }),
  useLayout: () => () => undefined,
}));
vi.mock('../RootLayout', () => ({ RootLayout: () => null }));
vi.mock('../../routing/AuthGuard', () => ({ AuthGuard: () => null }));
vi.mock('../../routing/SignedInRedirect', () => ({ SignedInRedirect: () => null }));
vi.mock('../../routing/404', () => ({ default: () => <h1>404</h1> }));

import { createAppRouter } from '../AppRoutes';

// Regression: a client-rendered app answers an unknown URL with HTTP 200, and its 404
// page carried no robots tag, so crawlers could index it as a real page.
describe('Vite 404 route', () => {
  it('marks the page noindex', async () => {
    const router = createAppRouter({
      routeGroups: [
        {
          label: 'pages',
          routes: [{ path: '/', component: async () => ({ default: () => null }) }],
        },
      ],
    });
    const notFound = router.routes[0]!.children!.find((route) => route.path === '*')!;
    const { findByText, unmount } = render(notFound.element as ReactElement);
    await findByText('404');
    expect(
      [...document.head.querySelectorAll('meta[name="robots"]')].map((tag) =>
        tag.getAttribute('content')
      )
    ).toEqual(['noindex']);
    unmount();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});
