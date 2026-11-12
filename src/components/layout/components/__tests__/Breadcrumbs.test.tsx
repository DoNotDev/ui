// packages/ui/src/components/layout/components/__tests__/Breadcrumbs.test.tsx

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const ID = 'ee8ba791-06ac-4c2d-9f3a-1b2c3d4e5f60';
let recordLabel: { id: string; label: string } | null = null;

vi.mock('@donotdev/core', () => ({
  useTranslation: () => ({ t: (_k: string, d: string) => d }),
  useLayout: (key: string) =>
    key === 'routeRecordLabel' ? recordLabel : undefined,
}));
vi.mock('@donotdev/components', () => ({
  cn: (...c: unknown[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@donotdev/ui/routing/hooks', () => ({
  useRoutePath: () => `/products/${ID}`,
}));
vi.mock('../../../../routing/useRouteDiscovery', () => ({
  useAllRoutes: () => [{ path: '/products' }],
}));
vi.mock('../../../../routing/Link', () => ({
  Link: ({ path, children }: { path: string; children: unknown }) => (
    <a href={path}>{children as string}</a>
  ),
}));

import Breadcrumbs from '../Breadcrumbs';

describe('Breadcrumbs record segment', () => {
  beforeEach(() => {
    recordLabel = null;
  });

  it("shows the record's name instead of its id", () => {
    recordLabel = { id: ID, label: 'Bakuchiol Cream' };
    const html = renderToStaticMarkup(<Breadcrumbs />);
    expect(html).toContain('Bakuchiol Cream');
    expect(html).not.toContain('Ee8ba791');
  });

  it('keeps the segment when no record label is set', () => {
    const html = renderToStaticMarkup(<Breadcrumbs />);
    expect(html).toContain('Ee8ba791');
  });
});
