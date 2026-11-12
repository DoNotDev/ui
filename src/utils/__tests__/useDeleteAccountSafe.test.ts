// packages/ui/src/utils/__tests__/useDeleteAccountSafe.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression: AuthMenu used to swap useDeleteAccount after an async import,
// changing the hook count between renders. The safe wrapper must pick its
// branch once, at module load, from the sync import.

describe('useDeleteAccountSafe', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('@donotdev/auth');
  });

  it('delegates to the real hook when @donotdev/auth exports it', async () => {
    const realState = { isDeleting: true };
    const real = vi.fn(() => realState);
    vi.doMock('@donotdev/auth', () => ({ useDeleteAccount: real }));

    const { useDeleteAccountSafe } = await import('../useDeleteAccountSafe');

    expect(useDeleteAccountSafe()).toBe(realState);
    expect(useDeleteAccountSafe()).toBe(realState);
    expect(real).toHaveBeenCalledTimes(2);
  });

  it('returns a stable inert state when @donotdev/auth is aliased empty', async () => {
    vi.doMock('@donotdev/auth', () => ({ useDeleteAccount: undefined }));

    const { useDeleteAccountSafe } = await import('../useDeleteAccountSafe');
    const first = useDeleteAccountSafe();

    expect(first).toBe(useDeleteAccountSafe());
    expect(first.showConfirmDialog).toBe(false);
    expect(first.showPasswordDialog).toBe(false);
    expect(first.isDeleting).toBe(false);
    expect(first.error).toBeNull();
    await expect(first.confirmDelete()).resolves.toBeUndefined();
  });
});
