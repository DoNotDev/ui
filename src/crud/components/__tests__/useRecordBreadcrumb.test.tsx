// packages/ui/src/crud/components/__tests__/useRecordBreadcrumb.test.tsx

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  setRouteRecordLabel: vi.fn(),
}));

vi.mock('@donotdev/core', () => ({
  useLayout: (key: string) =>
    key === 'setRouteRecordLabel' ? state.setRouteRecordLabel : null,
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
  deriveEntitySeo: (_entity: unknown, record: { name: string }) => ({ title: record.name }),
}));
vi.mock('@donotdev/ui/routing/hooks', () => ({ useParams: () => state.params }));

import { useRecordBreadcrumb } from '../useRecordBreadcrumb';

const ENTITY = { namespace: 'entity-product' } as never;

/**
 * Regression: the record label was keyed by the record id only, so on a slug URL
 * (`/produits/serum`) the visible breadcrumb kept "Serum" while the page's BreadcrumbList
 * JSON-LD ended with the record title.
 */
describe('useRecordBreadcrumb', () => {
  beforeEach(() => state.setRouteRecordLabel.mockClear());

  it('labels the URL segment naming the record: its slug on /produits/:slug', () => {
    state.params = { slug: 'serum' };
    renderHook(() =>
      useRecordBreadcrumb(ENTITY, { id: 'a1b2', slug: 'serum', name: 'Bakuchiol Serum' })
    );
    expect(state.setRouteRecordLabel).toHaveBeenCalledWith({
      id: 'serum',
      label: 'Bakuchiol Serum',
    });
  });

  it('decoded slug values match; an id route keeps the id', () => {
    state.params = { slug: 'cr%C3%A8me' };
    renderHook(() => useRecordBreadcrumb(ENTITY, { id: 'x', slug: 'crème', name: 'Crème' }));
    expect(state.setRouteRecordLabel).toHaveBeenLastCalledWith({ id: 'crème', label: 'Crème' });

    state.params = { id: 'a1b2' };
    renderHook(() => useRecordBreadcrumb(ENTITY, { id: 'a1b2', name: 'Serum' }));
    expect(state.setRouteRecordLabel).toHaveBeenLastCalledWith({ id: 'a1b2', label: 'Serum' });
  });
});
