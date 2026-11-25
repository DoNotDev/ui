// packages/ui/src/routing/__tests__/Link.test.tsx

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const internal = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

// Platform link stub: records what Link hands to the platform (next/link or react-router)
vi.mock('@donotdev/ui/routing/link', () => ({
  InternalLink: ({ children, path, ...rest }: { children?: ReactNode; path: string } & Record<string, unknown>) => {
    internal.props = { path, ...rest };
    return <a href={path}>{children}</a>;
  },
}));
vi.mock('@donotdev/core', () => ({
  useConsent: () => vi.fn(),
  useTranslation: () => ({ t: (key: string) => key }),
  useAppConfig: () => ({}),
  isCookieNoticeRequired: () => false,
  getDndevConfig: () => null,
}));

import { Link } from '../Link';

beforeEach(() => {
  internal.props = null;
});

describe('Link', () => {
  it('internal path: renders the platform link with prefetch on by default', () => {
    render(<Link path="/produits" label="Produits" />);
    expect(internal.props).toMatchObject({ path: '/produits', prefetch: true, 'aria-label': 'Produits' });
  });

  it('internal path: forwards replace, prefetch={false}, onClick and className', () => {
    const onClick = vi.fn();
    render(
      <Link path="/a" replace prefetch={false} onClick={onClick} className="nav">
        A
      </Link>
    );
    expect(internal.props).toMatchObject({ path: '/a', replace: true, prefetch: false, onClick, className: 'nav' });
  });

  it('external URL: plain <a target="_blank">, not the platform link', () => {
    render(<Link path="https://example.com" label="Ext" />);
    const link = screen.getByRole('link', { name: 'Ext' });
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(internal.props).toBeNull();
  });
});
