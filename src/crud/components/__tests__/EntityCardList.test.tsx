// packages/ui/src/crud/components/__tests__/EntityCardList.test.tsx

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Opt-in feed (pageSize): 12 cards first, 12 more each time the sentinel after the grid
// comes into range, no sentinel once every card is shown.

const ROWS = Array.from({ length: 30 }, (_, i) => ({
  id: `a${i + 1}`,
  name: `Apartment ${i + 1}`,
}));

const { observed, listState } = vi.hoisted(() => ({
  observed: [] as Array<(entry: { isIntersecting: boolean }) => void>,
  listState: {
    error: null as unknown,
    refresh: (() => Promise.resolve()) as () => Promise<void>,
  },
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
    items: listState.error ? [] : ROWS,
    processed: listState.error ? [] : ROWS,
    loading: false,
    error: listState.error,
    refresh: listState.refresh,
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
    listState.error = null;
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

describe('EntityCardList read failure', () => {
  beforeEach(() => {
    observed.length = 0;
    listState.error = null;
    listState.refresh = () => Promise.resolve();
  });

  // Owner decision 2026-11-25 E1: the shared load error box (translated title and
  // reason, Retry), never the raw message; said once (no failed Section heading)
  it('shows the shared load error and a retry, never the raw message', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const retry = vi.fn(() => Promise.resolve());
    const raw = new Error('Missing or insufficient permissions.');
    listState.error = raw;
    listState.refresh = retry;
    render(<EntityCardList entity={entity} hideFilters />);
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('errors.fetchFailed')).toBeTruthy();
    expect(alert.textContent).toContain('messages.error');
    expect(screen.queryByText(raw.message)).toBeNull();
    expect(screen.getAllByText('errors.fetchFailed')).toHaveLength(1);
    expect(screen.queryByText('emptyState.title')).toBeNull();
    expect(screen.queryAllByTestId('card')).toHaveLength(0);
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), raw);
    fireEvent.click(screen.getByRole('button', { name: 'routeError.tryAgain' }));
    expect(retry).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
