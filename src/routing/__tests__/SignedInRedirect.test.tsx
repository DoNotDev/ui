// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  navigate: vi.fn(),
  storage: new Map<string, string>(),
}));

vi.mock('@donotdev/core', () => ({
  isClient: () => true,
  safeSessionStorage: {
    getItem: (key: string) => state.storage.get(key) ?? null,
  },
}));
vi.mock('@donotdev/ui/routing/hooks', () => ({
  useNavigate: () => state.navigate,
}));
vi.mock('../../utils/useAuthSafe', () => ({
  useAuthSafe: (key: string) => (key === 'user' ? state.user : undefined),
}));

import { SignedInRedirect } from '../SignedInRedirect';

const mount = () =>
  render(
    <SignedInRedirect to="/catalogue">
      <span>home</span>
    </SignedInRedirect>
  );

describe('SignedInRedirect', () => {
  beforeEach(() => {
    state.user = null;
    state.navigate.mockReset();
    state.storage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('renders the page and does nothing for a signed-out visitor', () => {
    mount();
    expect(screen.getByText('home')).toBeTruthy();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it('replaces to the target once the user is known', () => {
    const { rerender } = mount();
    expect(state.navigate).not.toHaveBeenCalled();
    state.user = { id: 'u1' };
    rerender(
      <SignedInRedirect to="/catalogue">
        <span>home</span>
      </SignedInRedirect>
    );
    expect(state.navigate).toHaveBeenCalledWith('/catalogue', { replace: true });
  });

  it('skips when ?returnTo= is pending', () => {
    state.user = { id: 'u1' };
    window.history.replaceState(null, '', '/?returnTo=%2Fcompte');
    mount();
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it('skips when a returnTo is saved in sessionStorage', () => {
    state.user = { id: 'u1' };
    state.storage.set('dndev.auth.returnTo', '/compte');
    mount();
    expect(state.navigate).not.toHaveBeenCalled();
  });
});
