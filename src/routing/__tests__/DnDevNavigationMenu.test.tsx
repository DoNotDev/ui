import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@donotdev/ui/routing/hooks', () => ({ useRoutePath: () => '/blog/post-1' }));
vi.mock('@donotdev/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@donotdev/core')>()),
  useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }),
}));
vi.mock('../useNavigation', () => ({ useNavigationItems: () => [] }));
vi.mock('../Link', () => ({
  Link: ({ children, path, ...rest }: { children?: ReactNode; path: string } & Record<string, unknown>) => (
    <a href={path} {...rest}>{children}</a>
  ),
}));
vi.mock('../../components/common/icon', () => ({ Icon: () => null }));

import { DnDevNavigationMenu } from '../DnDevNavigationMenu';

const routes = [
  { label: 'Home', path: '/' },
  { label: 'Blog', path: '/blog' },
  { label: 'About', path: '/about' },
] as never;

describe('DnDevNavigationMenu active page', () => {
  it('marks the route the current path is nested under, and only it', () => {
    render(<DnDevNavigationMenu routes={routes} overflowDetection showIcons={false} />);
    expect(screen.getByText('Blog').closest('a')?.getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Blog').closest('a')?.getAttribute('data-active')).toBe('true');
    expect(screen.getByText('Home').closest('a')?.hasAttribute('aria-current')).toBe(false);
    expect(screen.getByText('About').closest('a')?.hasAttribute('aria-current')).toBe(false);
  });
});
