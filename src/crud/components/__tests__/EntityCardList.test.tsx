// packages/ui/src/crud/components/__tests__/EntityCardList.test.tsx

import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Opt-in feed (pageSize): 12 cards first, 12 more each time the sentinel after the grid
// comes into range, no sentinel once every card is shown.

const ROWS = Array.from({ length: 30 }, (_, i) => ({
  id: `a${i + 1}`,
  name: `Apartment ${i + 1}`,
}));

const { observed } = vi.hoisted(() => ({
  observed: [] as Array<(entry: { isIntersecting: boolean }) => void>,
}));

vi.mock('@donotdev/components', async (orig) => ({
  ...(await orig<object>()),
  observeElement: (
    _element: Element,
    callback: (entry: { isIntersecting: boolean }) => void
  ) => {
    observed.push(callback);
    return () => {
      observed.splice(observed.indexOf(callback), 1);
    };
  },
}));
vi.mock('@donotdev/core', async (orig) => ({
  ...(await orig<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../routing', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../../utils/useAuthSafe', () => ({ useAuthSafe: () => null }));
vi.mock('../CrudCardLink', () => ({
  CrudCard: ({ item }: { item: { id: string } }) => (
    <div data-testid="card">{item.id}</div>
  ),
}));
vi.mock('../../crudImports', () => ({
  isCrudModuleAvailable: true,
  useCrudCardList: () => ({
    items: ROWS,
    processed: ROWS,
    loading: false,
    error: null,
  }),
  useEntityFavorites: () => ({
    isFavorite: () => false,
    toggleFavorite: vi.fn(),
    favoritesFilter: () => true,
  }),
  useCrudFilters: () => ({
    showFavoritesOnly: false,
    setShowFavoritesOnly: vi.fn(),
    filters: {},
    setFilters: vi.fn(),
  }),
  EntityFilters: () => null,
}));

import { EntityCardList } from '../EntityCardList';
import { listedProductEntity as entity } from '@dndev/test-entities';

const cardCount = () => screen.getAllByTestId('card').length;
const reachEnd = () =>
  act(() => {
    observed.at(-1)!({ isIntersecting: true });
  });

describe('EntityCardList feed', () => {
  beforeEach(() => {
    observed.length = 0;
  });

  it('renders every card when pageSize is not set', () => {
    render(<EntityCardList entity={entity} hideFilters />);
    expect(cardCount()).toBe(30);
    expect(observed).toHaveLength(0);
  });

  it('renders 12 cards first', () => {
    render(<EntityCardList entity={entity} hideFilters pageSize={12} />);
    expect(cardCount()).toBe(12);
    expect(observed).toHaveLength(1);
  });

  it('adds 12 cards per reach of the end and stops at the last card', () => {
    render(<EntityCardList entity={entity} hideFilters pageSize={12} />);
    reachEnd();
    expect(cardCount()).toBe(24);
    reachEnd();
    expect(cardCount()).toBe(30);
    expect(observed).toHaveLength(0);
  });

  it('ignores the sentinel leaving the viewport', () => {
    render(<EntityCardList entity={entity} hideFilters pageSize={12} />);
    act(() => {
      observed.at(-1)!({ isIntersecting: false });
    });
    expect(cardCount()).toBe(12);
  });
});
