// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const appConfig: { auth: false | { authRoute: string } } = { auth: false };

vi.mock('@donotdev/core', () => ({
  isClient: () => true,
  FEATURE_STATUS: { INITIALIZING: 'initializing', READY: 'ready' },
  useAppConfig: () => appConfig,
  useAuthConfig: () => appConfig.auth,
}));

vi.mock('../useLocation.vite', () => ({
  useLocation: () => ({ pathname: '/private', search: '' }),
}));

vi.mock('../../../utils/useAuthSafe', () => ({
  useAuthSafe: (key: string) =>
    ({
      user: null,
      status: 'ready',
      can: { navigate: () => false },
    })[key],
}));

import { useRedirectGuard } from '../useRedirectGuard.vite';

describe('useRedirectGuard (vite)', () => {
  beforeEach(() => {
    appConfig.auth = false;
  });

  // Regression: with AppConfig.auth = false the redirect target was undefined (/undefined).
  it('throws when a route requires auth but AppConfig.auth is false', () => {
    expect(() =>
      renderHook(() => useRedirectGuard({ auth: { required: true } }))
    ).toThrow(/AppConfig\.auth is false/);
  });

  it('uses a custom redirectTo when auth is disabled', () => {
    const { result } = renderHook(() =>
      useRedirectGuard({ auth: { required: true }, redirectTo: '/home' })
    );
    expect(result.current.redirectTo).toBe('/home');
  });

  it('redirects to authRoute when auth is enabled', () => {
    appConfig.auth = { authRoute: '/login' };
    const { result } = renderHook(() =>
      useRedirectGuard({ auth: { required: true } })
    );
    expect(result.current).toMatchObject({
      shouldRedirect: true,
      redirectTo: '/login',
    });
  });
});
