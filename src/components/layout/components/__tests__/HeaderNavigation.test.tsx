// packages/ui/src/components/layout/components/__tests__/HeaderNavigation.test.tsx

import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { NavigationItem } from '../../../../routing/useNavigation';
import HeaderNavigation from '../header/HeaderNavigation';

const nav = vi.hoisted(() => ({ isActive: false }));

vi.mock('../../../../routing/useNavigation', () => ({
  useNavigationItems: () => [],
  useNavigationRoute: (path: string): NavigationItem | undefined =>
    path === '/catalogue'
      ? {
          path,
          label: 'Catalogue',
          isActive: nav.isActive,
          hasChildren: false,
        }
      : undefined,
}));
vi.mock('../../../../routing/Link', () => ({
  Link: ({ path, children, ...props }: { path: string; children?: unknown }) => (
    <a href={path} {...props}>
      {children as never}
    </a>
  ),
}));
vi.mock('@donotdev/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@donotdev/core')>()),
  useBreakpoint: () => false,
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('HeaderNavigation single-item mode', () => {
  it('marks the current page with aria-current and data-active', () => {
    nav.isActive = true;
    const html = renderToString(<HeaderNavigation path="/catalogue" />);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('data-active="true"');
  });

  it('leaves other pages unmarked', () => {
    nav.isActive = false;
    const html = renderToString(<HeaderNavigation path="/catalogue" />);
    expect(html).toContain('Catalogue');
    expect(html).not.toContain('aria-current');
    expect(html).not.toContain('data-active');
  });

  it('renders nothing for a route the user may not see', () => {
    expect(renderToString(<HeaderNavigation path="/pro" />)).toBe('');
  });
});
