// packages/ui/src/providers/__tests__/NextJsAppProvidersNotFound.test.tsx

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

/** Snapshots NextJsAppProviders handed to AuthSessionProvider, in render order */
const seen = vi.hoisted(() => ({ snapshots: [] as unknown[] }));

// Hoisted with the vi.mock factories that use them
const { Pass, Empty } = vi.hoisted(() => ({
  Pass: ({ children }: { children?: ReactNode }) => children,
  Empty: () => null,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock('@tanstack/react-query-next-experimental', () => ({
  ReactQueryStreamedHydration: Pass,
}));
vi.mock('@donotdev/core', () => ({
  AuthSessionProvider: ({
    snapshot,
    children,
  }: {
    snapshot: unknown;
    children: ReactNode;
  }) => {
    seen.snapshots.push(snapshot);
    return <>{children}</>;
  },
  AppConfigProvider: Pass,
  LanguageNavigationProvider: Pass,
  useNavigationStore: (
    select: (s: { startNavigation: (to?: string, from?: string) => void }) => unknown
  ) => select({ startNavigation: () => {} }),
  QueryProviders: Pass,
  RequestLanguageProvider: Pass,
  getI18nInstance: () => ({ language: 'fr', changeLanguage: async () => {} }),
  getLanguageRouting: () => ({ languages: ['fr', 'en'], defaultLanguage: 'fr' }),
  getRequestLanguage: () => 'fr',
  isMultilingual: () => true,
  hasProvider: (name: string) => name === 'auth',
  // A cookie-session provider: no session cookie reads as signed out
  getProvider: () => ({
    readSessionSnapshot: (cookieHeader: string) =>
      cookieHeader.includes('sb-ref-auth-token=')
        ? { user: { id: 'user-1' } }
        : { user: null },
  }),
  useConsent: () => false,
}));
vi.mock('@donotdev/ui/routing/hooks', () => ({ useUrlLanguage: () => 'fr' }));
vi.mock('../../components/cookie-consent/useCookieNoticeRequired', () => ({
  useCookieNoticeRequired: () => false,
}));
vi.mock('../../internal/initializers/NextJsStoresInitializer', () => ({
  NextJsStoresInitializer: Pass,
}));
vi.mock('../../internal/layout/components/AutoMetaTags', () => ({
  AutoMetaTags: Empty,
}));
vi.mock('../../internal/layout/components/FaviconHead', () => ({
  default: Empty,
}));
vi.mock('../../internal/layout/DnDevLayout', () => ({ DnDevLayout: Pass }));
vi.mock('../../internal/providers/SentryInitializer', () => ({
  SentryInitializer: Empty,
}));
vi.mock('../../internal/providers/UIProviders', () => ({ UIProviders: Pass }));
vi.mock('../../routing/AuthReturnTo', () => ({ AuthReturnTo: Empty }));
vi.mock('../../utils/useAuthSafe', () => ({ PasswordResetCallback: Empty }));

import { NotFoundDocument } from '../../routing/NotFoundDocument';
import { NextJsAppProviders } from '../NextJsAppProviders';

const snapshotOf = (tree: ReactNode) => {
  seen.snapshots = [];
  renderToStaticMarkup(tree);
  return seen.snapshots[0];
};

// Regression (shopkb, signed in, any unknown URL): the 404 document's serverCookies=""
// seeded "signed out", the provider's session then reset the cache and refreshed the
// router, the RSC request answered 404 and Next reloaded the page, about once a second.
describe('NextJsAppProviders auth snapshot', () => {
  beforeEach(() => {
    seen.snapshots = [];
  });

  it('is unknown (null) in a 404 document, whatever serverCookies says', () => {
    expect(
      snapshotOf(
        <NotFoundDocument>
          <NextJsAppProviders serverCookies="" acceptLanguage={null}>
            <></>
          </NextJsAppProviders>
        </NotFoundDocument>
      )
    ).toBeNull();
    expect(
      snapshotOf(
        <NotFoundDocument>
          <NextJsAppProviders serverCookies="sb-ref-auth-token=x">
            <></>
          </NextJsAppProviders>
        </NotFoundDocument>
      )
    ).toBeNull();
  });

  it('reads the request cookies outside a 404 document', () => {
    expect(
      snapshotOf(
        <NextJsAppProviders serverCookies="" acceptLanguage={null}>
          <></>
        </NextJsAppProviders>
      )
    ).toEqual({ user: null });
    expect(
      snapshotOf(
        <NextJsAppProviders serverCookies="sb-ref-auth-token=x">
          <></>
        </NextJsAppProviders>
      )
    ).toEqual({ user: { id: 'user-1' } });
  });

  it('is unknown without a cookie header', () => {
    expect(
      snapshotOf(
        <NextJsAppProviders>
          <></>
        </NextJsAppProviders>
      )
    ).toBeNull();
  });
});
