// packages/ui/src/routing/link/__tests__/InternalLink.next.test.tsx

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const closeAll = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({ isAuthenticated: false }));
const nextLinkProps = vi.hoisted(() => ({ last: {} as Record<string, unknown> }));

// next/link stub: records the props Link hands to it, renders its anchor
vi.mock('next/link', () => ({
  default: ({
    href,
    prefetch: _prefetch,
    replace: _replace,
    onNavigate: _onNavigate,
    children,
    ...rest
  }: Record<string, unknown> & { href: string; children?: ReactNode }) => {
    nextLinkProps.last = { href, prefetch: _prefetch, replace: _replace, onNavigate: _onNavigate, ...rest };
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));
vi.mock('@donotdev/ui/routing/hooks', () => ({
  useLocalizedPath: () => (path: string) => `/en${path}`,
}));
vi.mock('../../../utils/useAuthSafe', () => ({
  useAuthSafe: (key: 'isAuthenticated') => auth[key],
}));
vi.mock('@donotdev/core', () => ({
  useOverlayStore: (select: (s: { closeAll: () => void }) => unknown) =>
    select({ closeAll }),
}));

import { InternalLink } from '../InternalLink.next';

beforeEach(() => {
  closeAll.mockReset();
  auth.isAuthenticated = false;
  nextLinkProps.last = {};
});

describe('InternalLink (Next.js, next/link)', () => {
  it('renders next/link with the localized absolute href (real <a href>)', () => {
    render(<InternalLink path="produits">Produits</InternalLink>);
    expect(nextLinkProps.last.href).toBe('/en/produits');
    expect(screen.getByRole('link', { name: 'Produits' }).getAttribute('href')).toBe(
      '/en/produits'
    );
  });

  it('prefetch default true → next/link default (null); false → disabled', () => {
    render(<InternalLink path="/a">A</InternalLink>);
    expect(nextLinkProps.last.prefetch).toBeNull();
    render(
      <InternalLink path="/b" prefetch={false}>
        B
      </InternalLink>
    );
    expect(nextLinkProps.last.prefetch).toBe(false);
  });

  it('signed in: prefetch true → full route (session tree is dynamic); false still disables', () => {
    auth.isAuthenticated = true;
    render(<InternalLink path="/a">A</InternalLink>);
    expect(nextLinkProps.last.prefetch).toBe(true);
    render(
      <InternalLink path="/b" prefetch={false}>
        B
      </InternalLink>
    );
    expect(nextLinkProps.last.prefetch).toBe(false);
  });

  it('same anchor HTML signed in and out (prefetch never reaches the markup)', () => {
    const { container: guest } = render(<InternalLink path="/a">A</InternalLink>);
    auth.isAuthenticated = true;
    const { container: signedIn } = render(<InternalLink path="/a">A</InternalLink>);
    expect(signedIn.innerHTML).toBe(guest.innerHTML);
  });

  it('passes replace, onClick and anchor attributes; closes overlays on navigation', () => {
    const onClick = vi.fn();
    render(
      <InternalLink path="/a" replace onClick={onClick} className="nav" aria-label="Accueil">
        A
      </InternalLink>
    );
    expect(nextLinkProps.last.replace).toBe(true);
    expect(nextLinkProps.last.onClick).toBe(onClick);
    expect(nextLinkProps.last.className).toBe('nav');
    expect(nextLinkProps.last['aria-label']).toBe('Accueil');
    (nextLinkProps.last.onNavigate as () => void)();
    expect(closeAll).toHaveBeenCalledTimes(1);
  });
});
