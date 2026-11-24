import { Component, type ReactNode } from 'react';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@donotdev/core', () => ({ handleError: vi.fn() }));

import DnDevErrorBoundary from '../DnDevErrorBoundary';

afterEach(cleanup);
// React logs every caught render error: keep the test output clean
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

/** Stands in for Next's not-found / redirect boundary above the framework one. */
class OuterBoundary extends Component<{ children: ReactNode }, { digest: string | null }> {
  state = { digest: null as string | null };
  static getDerivedStateFromError(error: { digest?: string }) {
    return { digest: error.digest ?? 'none' };
  }
  render() {
    return this.state.digest ? <p>outer:{this.state.digest}</p> : this.props.children;
  }
}

function Throws({ error }: { error: unknown }): ReactNode {
  throw error;
}

const nextError = (digest: string) => Object.assign(new Error(digest), { digest });

function renderThrowing(error: unknown) {
  render(
    <OuterBoundary>
      <DnDevErrorBoundary level="route" fallback={() => <p>framework fallback</p>}>
        <Throws error={error} />
      </DnDevErrorBoundary>
    </OuterBoundary>
  );
}

describe('DnDevErrorBoundary and Next router control flow', () => {
  it.each([
    'NEXT_HTTP_ERROR_FALLBACK;404',
    'NEXT_HTTP_ERROR_FALLBACK;403',
    'NEXT_REDIRECT;replace;/fr/catalogue;307;',
  ])('lets %s through to the boundary above', (digest) => {
    renderThrowing(nextError(digest));
    expect(screen.getByText(`outer:${digest}`)).toBeTruthy();
    expect(screen.queryByText('framework fallback')).toBeNull();
  });

  it('catches an ordinary error with its fallback', () => {
    renderThrowing(new Error('boom'));
    expect(screen.getByText('framework fallback')).toBeTruthy();
  });

  it('catches an error whose digest is not a Next router code', () => {
    renderThrowing(nextError('1234567890'));
    expect(screen.getByText('framework fallback')).toBeTruthy();
  });
});
