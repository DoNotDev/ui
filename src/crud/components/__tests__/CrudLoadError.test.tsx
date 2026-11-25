// packages/ui/src/crud/components/__tests__/CrudLoadError.test.tsx

/**
 * @fileoverview The shared load error (owner decision 2026-11-25 E1): list, joined list
 * and detail view. Translated title and reason from the error code, Retry; the raw
 * error only in the console.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DoNotDevError } from '@donotdev/core';

vi.mock('@donotdev/core', async (orig) => ({
  ...(await orig<object>()),
  useTranslation: (ns: string) => ({
    t: (key: string, opts?: { entity?: string }) =>
      `${ns}:${key}${opts?.entity ? `(${opts.entity})` : ''}`,
    language: 'fr',
  }),
}));

import { CrudLoadError } from '../CrudLoadError';

describe('CrudLoadError', () => {
  it('shows the translated title and reason, retries, logs the raw error only', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onRetry = vi.fn();
    const error = new DoNotDevError('Request failed.', 'unavailable');
    render(<CrudLoadError error={error} entity="Produits" onRetry={onRetry} />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('crud:errors.fetchFailed(Produits)');
    expect(alert.textContent).toContain('dndev:messages.networkError');
    expect(alert.textContent).not.toContain('Request failed.');
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Produits'), error);
    fireEvent.click(screen.getByRole('button', { name: 'dndev:routeError.tryAgain' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
