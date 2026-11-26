// packages/ui/src/crud/components/__tests__/EntityList.test.tsx

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';


// Admin list UX: open-link icon | bulk-select checkbox | fields edited in their
// cells; nested list of a parent's children; bulk delete of checked rows.

const ROWS = [
  { id: 'p1', name: 'Toner', brandId: 'b1', categoryId: 'c1' },
  { id: 'p2', name: 'Cream', brandId: 'b1', categoryId: 'c2' },
];

const { listSpy, bulkSpy, listState } = vi.hoisted(() => ({
  listSpy: vi.fn(),
  /** The read's outcome: rows (default), or a fetch error with no rows */
  listState: {
    error: null as Error | null,
    mutate: (() => Promise.resolve()) as () => Promise<void>,
    /** Rows of the read (null: ROWS) */
    rows: null as Array<Record<string, unknown> & { id: string }> | null,
    /** Active filters of the collection */
    filters: {} as Record<string, unknown>,
    setFilters: (() => {}) as (filters: Record<string, unknown>) => void,
  },
  bulkSpy: vi.fn(async () => ({
    insertedIds: [],
    updatedIds: [],
    deletedIds: [],
    failed: [] as Array<{
      op: string;
      id?: string;
      error: string;
      field?: string;
      i18nKey?: string;
    }>,
  })),
}));

vi.mock('@donotdev/core', async (orig) => ({
  ...(await orig<object>()),
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; query?: string }) =>
      opts?.count !== undefined
        ? `${key}:${opts.count}`
        : opts?.query !== undefined
          ? `${key}:${opts.query}`
          : key,
    i18n: { language: 'en' },
    language: 'en',
  }),
}));
vi.mock('../../../routing', () => ({
  Link: ({ path, children, ...rest }: { path: string; children?: ReactNode }) => (
    <a href={path} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));
vi.mock('../../../utils/useAuthSafe', () => ({
  useAuthSafe: () => 'admin',
}));
vi.mock('../../crudImports', () => ({
  isCrudModuleAvailable: true,
  translateFieldLabel: (name: string) => name,
  translateLabel: (label: string) => label,
  formatValue: (value: unknown) => String(value ?? ''),
  useReferenceResolver: () => ({
    brands: { b1: 'Findive', b2: 'Cerolabs' },
    categories: { c1: 'Toners', c2: 'Creams' },
  }),
  useCrud: () => ({ bulk: bulkSpy }),
  // No edit form open on a parent record: the list is standalone.
  useJoinedForm: () => null,
  useCrudFilters: () => ({ filters: listState.filters, setFilters: listState.setFilters }),
  useCrudPageSize: () => ({ pageSize: 12, setPageSize: vi.fn() }),
  useCrudList: (_entity: unknown, options: unknown) => {
    listSpy(options);
    const rows = listState.error ? [] : (listState.rows ?? ROWS);
    return {
      data: { items: rows, total: rows.length },
      items: rows,
      processed: rows,
      loading: false,
      error: listState.error,
      mutate: listState.mutate,
      effectiveMode: 'client',
    };
  },
  EntityFilters: ({
    fieldsToFilter,
    viewerRole,
  }: {
    fieldsToFilter: string[];
    viewerRole?: string;
  }) => (
    <div data-testid="filters" data-viewer-role={viewerRole}>
      {fieldsToFilter.join(',')}
    </div>
  ),
}));

import { DoNotDevError, defineEntity } from '@donotdev/core';

import { EntityList } from '../EntityList';
import { listedProductEntity as productEntity } from '@dndev/test-entities';


const headers = () =>
  screen.getAllByRole('columnheader').map((th) => th.textContent);

/** Cell of a column (by header text) in a body row. */
const cellOf = (row: number, header: string) => {
  const index = headers().indexOf(header);
  return document.querySelectorAll('tbody tr')[row]!.children[index] as HTMLElement;
};

/** Focuses an editable cell: its editor opens in place of the text. */
const openEditor = (row: number, header: string) => {
  const display = cellOf(row, header).querySelector<HTMLElement>('[data-edit-row]')!;
  act(() => display.focus());
  return cellOf(row, header).querySelector<HTMLSelectElement & HTMLInputElement>('[data-edit-row]')!;
};

describe('EntityList rows', () => {
  beforeEach(() => {
    listSpy.mockClear();
    bulkSpy.mockClear();
  });

  it('opens records from a link icon and edits references in their cells', () => {
    render(<EntityList entity={productEntity} basePath="/produits" />);
    const links = screen.getAllByRole('link', { name: 'actions.open' });
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/produits/p1',
      '/produits/p2',
    ]);
    // Reference cell shows its value as text until focused (formatValue mock: the id)
    expect(cellOf(0, 'brandId').querySelector('select')).toBeNull();
    expect(cellOf(0, 'brandId').textContent).toBe('b1');
    // Focused: a dropdown of resolved labels, current value selected
    const brandCell = openEditor(0, 'brandId');
    expect(brandCell.tagName).toBe('SELECT');
    expect(brandCell.value).toBe('b1');
    expect(
      [...(brandCell as HTMLSelectElement).options].map((o) => o.textContent)
    ).toContain('Cerolabs');
  });

  it('filters with the viewer role (admin-only fields stay filterable)', async () => {
    render(<EntityList entity={productEntity} basePath="/produits" />);
    // Filters open in a side sheet from the toolbar button
    expect(screen.queryByTestId('filters')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'filters.button' }));
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getByText('filters.title')).toBeTruthy();
    expect(within(sheet).getByTestId('filters').getAttribute('data-viewer-role')).toBe(
      'admin'
    );
  });

  it('deletes the checked rows in one bulk call', async () => {
    render(<EntityList entity={productEntity} basePath="/produits" />);
    fireEvent.click(screen.getAllByRole('checkbox')[0]!); // select all
    fireEvent.click(
      screen.getByRole('button', { name: 'bulkEdit.deleteSelected:2' })
    );
    fireEvent.click(await screen.findByRole('button', { name: 'actions.delete' }));
    await waitFor(() =>
      expect(bulkSpy).toHaveBeenCalledWith({ deletes: ['p1', 'p2'] })
    );
  });
});

// Owner decision 2026-11-25 F7: no delete, editing and selection (bulk edit) stay
describe('EntityList deletable={false}', () => {
  beforeEach(() => {
    bulkSpy.mockClear();
  });

  it('keeps cell editing and row selection, shows no Delete', () => {
    render(<EntityList entity={productEntity} basePath="/produits" deletable={false} />);
    // Still edited in place
    expect(openEditor(0, 'brandId').tagName).toBe('SELECT');
    // Still selectable: the selection bar opens (bulk edit), without Delete
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    const bar = screen.getByRole('toolbar');
    expect(within(bar).getByRole('button', { name: 'table.clearSelection' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'bulkEdit.deleteSelected:2' })).toBeNull();
    expect(bulkSpy).not.toHaveBeenCalled();
  });
});

describe('EntityList partial bulk save', () => {
  beforeEach(() => bulkSpy.mockClear());

  it('keeps failed rows pending with their cells in error; saved rows leave', async () => {
    bulkSpy.mockResolvedValueOnce({
      insertedIds: [],
      updatedIds: ['p1'],
      deletedIds: [],
      failed: [{ op: 'update', id: 'p2', error: 'denied' }],
    });
    const { container } = render(<EntityList entity={productEntity} basePath="/produits" />);
    fireEvent.change(openEditor(0, 'brandId'), { target: { value: 'b2' } });
    fireEvent.change(openEditor(1, 'brandId'), { target: { value: 'b2' } });
    // Unsaved edits sit in the bottom bar, not above the table
    const pending = screen.getByText('bulkEdit.pending:2');
    expect(pending.closest('.dndev-action-bar')).toBeTruthy();
    expect(container.contains(pending)).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'actions.save' }));

    // p2's sent cell is in error (the DataTable's list), no 'N failed' text
    await waitFor(() =>
      expect(cellOf(1, 'brandId').getAttribute('data-invalid')).toBe('true')
    );
    expect(screen.queryByText('bulkEdit.failed:1')).toBeNull();
    const errors = screen.getByRole('button', { name: 'table.errors' });
    expect(errors.closest('.dndev-action-bar')).toBeTruthy();
    const cell = cellOf(1, 'brandId').querySelector<HTMLElement>('[data-edit-row]')!;
    // The backend's own text ('denied') is never shown
    expect(document.getElementById(cell.getAttribute('aria-describedby')!)?.textContent).toBe(
      'crud:form.saveFailed'
    );
    expect(cellOf(0, 'brandId').getAttribute('data-invalid')).toBeNull();
    expect(bulkSpy).toHaveBeenCalledWith({
      updates: [
        { id: 'p1', patch: { brandId: 'b2' } },
        { id: 'p2', patch: { brandId: 'b2' } },
      ],
    });
    // p2 stays pending, p1 is saved
    expect(screen.getByText('bulkEdit.pending:1')).toBeTruthy();
    // Edited again: its cell leaves the error list, the button goes with it
    fireEvent.change(openEditor(1, 'brandId'), { target: { value: 'b1' } });
    expect(cellOf(1, 'brandId').getAttribute('data-invalid')).toBeNull();
    expect(screen.queryByRole('button', { name: 'table.errors' })).toBeNull();
  });

  it('marks only the field the backend names, with its i18n message', async () => {
    bulkSpy.mockResolvedValueOnce({
      insertedIds: [],
      updatedIds: [],
      deletedIds: [],
      failed: [
        {
          op: 'update',
          id: 'p1',
          error: 'violates check constraint',
          field: 'brandId',
          i18nKey: 'crud:childRows.invalidValue',
        },
      ],
    });
    render(<EntityList entity={productEntity} basePath="/produits" />);
    fireEvent.change(openEditor(0, 'brandId'), { target: { value: 'b2' } });
    fireEvent.change(openEditor(0, 'categoryId'), { target: { value: 'c2' } });
    fireEvent.click(screen.getByRole('button', { name: 'actions.save' }));
    await waitFor(() =>
      expect(cellOf(0, 'brandId').getAttribute('data-invalid')).toBe('true')
    );
    expect(cellOf(0, 'categoryId').getAttribute('data-invalid')).toBeNull();
    const cell = cellOf(0, 'brandId').querySelector<HTMLElement>('[data-edit-row]')!;
    expect(document.getElementById(cell.getAttribute('aria-describedby')!)?.textContent).toBe(
      'crud:childRows.invalidValue'
    );
  });
});

describe('EntityList parent (nested list)', () => {
  beforeEach(() => listSpy.mockClear());

  it('lists the parent children, hides the parent column, prefills the add link', () => {
    render(
      <EntityList
        entity={productEntity}
        basePath="/produits"
        parent={{ field: 'brandId', value: 'b1' }}
      />
    );
    expect(listSpy.mock.calls[0]![0]).toMatchObject({
      queryOptions: {
        where: [{ field: 'brandId', operator: '==', value: 'b1' }],
      },
    });
    expect(headers()).not.toContain('brandId');
    expect(
      screen.getByRole('link', { name: /addNew/ }).getAttribute('href')
    ).toBe('/produits/new?brandId=b1');
  });

  it('rejects a parent field that is not a reference of the entity', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <EntityList
          entity={productEntity}
          parent={{ field: 'name', value: 'b1' }}
        />
      )
    ).toThrow(/not a reference field/);
  });
});

describe('EntityList read failure', () => {
  beforeEach(() => {
    listState.rows = null;
    listState.error = null;
    listState.mutate = () => Promise.resolve();
  });

  // Owner decision 2026-11-25 E1: translated title and reason, Retry; the raw error in the console
  it('shows the translated load error and a retry, never the raw error, not an empty table', () => {
    const retry = vi.fn(() => Promise.resolve());
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const raw = new Error('[dndev] Direct adapter cannot access "products"');
    listState.error = raw;
    listState.mutate = retry;
    render(<EntityList entity={productEntity} basePath="/produits" />);
    // Said once: the box's title, no failed Section heading (as the detail page)
    expect(screen.getAllByText('errors.fetchFailed')).toHaveLength(1);
    expect(screen.queryByText('list.count:0')).toBeNull();
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('errors.fetchFailed')).toBeTruthy();
    expect(alert.textContent).toContain('messages.error');
    expect(alert.textContent).not.toContain('Direct adapter');
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), raw);
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'routeError.tryAgain' }));
    expect(retry).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it('gives the reason of a coded error (permission denied: forbidden)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    listState.error = new DoNotDevError('Request failed.', 'permission-denied');
    render(<EntityList entity={productEntity} basePath="/produits" />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('messages.forbidden');
    expect(alert.textContent).not.toContain('Request failed.');
    consoleError.mockRestore();
  });

  it('a successful read shows the table and its count, no error', () => {
    render(<EntityList entity={productEntity} basePath="/produits" />);
    expect(screen.queryByText('errors.fetchFailed')).toBeNull();
    expect(screen.getByText('list.count:2')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('EntityList price sort', () => {
  // The rows seen live: 12,19 € -15% is amount 14,34 discounted, shown between 11,69 € and 12,5 €
  const pricedEntity = defineEntity({
    name: 'PricedProduct',
    collection: 'priced_products',
    listFields: ['name', 'price'],
    fields: {
      name: { name: 'name', label: 'name', type: 'text', visibility: 'guest', validation: {} },
      // VAT-inclusive prices (V2): the column title carries "VAT incl."
      price: { name: 'price', label: 'price', type: 'price', visibility: 'guest', validation: {}, options: { fieldSpecific: { vatIncluded: true } } },
    },
  });
  beforeEach(() => {
    listState.error = null;
    listState.rows = [
      { id: 'plain-12.5', name: 'A', price: { amount: 12.5, currency: 'EUR' } },
      { id: 'disc-14.34', name: 'B', price: { amount: 14.34, currency: 'EUR', discountPercent: 15 } },
      { id: 'plain-11.69', name: 'C', price: { amount: 11.69, currency: 'EUR' } },
      { id: 'plain-13.14', name: 'D', price: { amount: 13.14, currency: 'EUR' } },
    ];
  });

  const order = () =>
    screen
      .getAllByRole('link', { name: 'actions.open' })
      .map((a) => a.getAttribute('href')?.split('/').pop());

  it('sorts price cells on the discounted price they show', () => {
    render(<EntityList entity={pricedEntity} basePath="/p" editable={false} />);
    // Price column title carries "VAT incl." (fieldColumnTitle), not each cell
    const header = screen.getAllByRole('columnheader').find((th) => th.textContent === 'crud:price.columnTitle')!;
    fireEvent.click(header);
    expect(order()).toEqual(['plain-11.69', 'disc-14.34', 'plain-12.5', 'plain-13.14']);
    fireEvent.click(header);
    expect(order()).toEqual(['plain-13.14', 'plain-12.5', 'disc-14.34', 'plain-11.69']);
  });
});

describe('EntityList admin header, toolbar and states', () => {
  beforeEach(() => {
    listState.rows = null;
    listState.error = null;
    listState.filters = {};
    listState.setFilters = () => {};
  });

  it('has a plain Section header: the count as the title (no separate plural), Add at the end', () => {
    const { container } = render(<EntityList entity={productEntity} basePath="/produits" />);
    const header = container.querySelector('.dndev-section-header')!;
    const title = header.querySelector('h2')!;
    // useTranslation mock: key:count; live: "2 products"
    expect(title.textContent).toBe('list.count:2');
    expect(title.getAttribute('data-title-variant')).toBe('heading');
    // One heading: a page that titles itself never shows the entity name twice
    expect(container.querySelectorAll('h2')).toHaveLength(1);
    expect(screen.queryByText('namePlural')).toBeNull();
    expect(header.querySelector('.dndev-section-title-meta')).toBeNull();
    expect(
      within(header as HTMLElement).getByRole('link', { name: /addNew/ }).getAttribute('href')
    ).toBe('/produits/new');
    // No marketing titles
    expect(screen.queryByText('filters.title')).toBeNull();
    expect(screen.queryByText(/results\.title/)).toBeNull();
  });

  it('puts search, Filters, Export and Refresh in one toolbar row above the table', () => {
    const { container } = render(<EntityList entity={productEntity} basePath="/produits" />);
    const toolbar = container.querySelector<HTMLElement>('.dndev-table-toolbar')!;
    expect(within(toolbar).getByPlaceholderText('actions.searchPlaceholder')).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'filters.button' })).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'table.export' })).toBeTruthy();
    expect(within(toolbar).getByRole('button', { name: 'actions.refresh' }).textContent).toContain(
      'actions.refresh'
    );
  });

  it('counts the active filters on the Filters button', () => {
    listState.filters = { brandId: ['b1'], name: 'to' };
    render(<EntityList entity={productEntity} basePath="/produits" />);
    expect(screen.getByRole('button', { name: 'filters.buttonActive:2' })).toBeTruthy();
  });

  it('hides the Filters button with hideFilters', () => {
    render(<EntityList entity={productEntity} basePath="/produits" hideFilters />);
    expect(screen.queryByRole('button', { name: 'filters.button' })).toBeNull();
  });

  it('empty collection: "No … yet" and the Add action in the empty row only', () => {
    listState.rows = [];
    const { container } = render(<EntityList entity={productEntity} basePath="/produits" />);
    // The title counts ("0 products"); "No … yet" is said once, in the empty row
    expect(container.querySelector('.dndev-section-header h2')!.textContent).toBe('list.count:0');
    expect(screen.getAllByText('list.empty')).toHaveLength(1);
    const empty = container.querySelector<HTMLElement>('td.dndev-table-empty')!;
    expect(within(empty).getByText('list.empty')).toBeTruthy();
    expect(within(empty).getByRole('link', { name: /addNew/ }).getAttribute('href')).toBe(
      '/produits/new'
    );
  });

  it('no search result: "No results for “x”" and Clear (search and filters)', () => {
    listState.rows = [];
    const setFilters = vi.fn();
    listState.setFilters = setFilters;
    const { container } = render(<EntityList entity={productEntity} basePath="/produits" />);
    fireEvent.change(screen.getByPlaceholderText('actions.searchPlaceholder'), {
      target: { value: 'zzzz' },
    });
    const empty = container.querySelector<HTMLElement>('td.dndev-table-empty')!;
    expect(within(empty).getByText('list.noResultsFor:zzzz')).toBeTruthy();
    fireEvent.click(within(empty).getByRole('button', { name: 'actions.clear' }));
    expect(setFilters).toHaveBeenCalledWith({});
    expect(
      (screen.getByPlaceholderText('actions.searchPlaceholder') as HTMLInputElement).value
    ).toBe('');
  });

  it('active filters without a match: the filters message and Clear', () => {
    listState.rows = [];
    listState.filters = { brandId: ['b9'] };
    const { container } = render(<EntityList entity={productEntity} basePath="/produits" />);
    const empty = container.querySelector<HTMLElement>('td.dndev-table-empty')!;
    expect(within(empty).getByText('filters.noResults')).toBeTruthy();
    expect(within(empty).getByRole('button', { name: 'actions.clear' })).toBeTruthy();
    // Products exist, none match: the title counts the results, not "No … yet"
    expect(container.querySelector('.dndev-section-header h2')!.textContent).toBe('list.count:0');
  });

  it('shows the Delete of the checked rows in the bottom selection bar', () => {
    const { container } = render(<EntityList entity={productEntity} basePath="/produits" />);
    fireEvent.click(screen.getAllByRole('checkbox')[0]!);
    const bar = screen.getByRole('toolbar');
    expect(bar.closest('.dndev-action-bar')).toBeTruthy();
    expect(container.contains(bar)).toBe(false);
    expect(within(bar).getByRole('button', { name: 'bulkEdit.deleteSelected:2' })).toBeTruthy();
    expect(within(bar).getByRole('button', { name: 'table.clearSelection' })).toBeTruthy();
  });
});

describe('EntityList column presets', () => {
  const presetEntity = defineEntity({
    name: 'PresetProduct',
    collection: 'preset_products',
    listFields: ['image', 'name', 'sku', 'active', 'launch', 'updated', 'status', 'brandId', 'stock', 'notes'],
    listCardFields: ['image', 'stock'],
    fields: {
      image: { name: 'image', label: 'image', type: 'image', visibility: 'guest', validation: {} },
      name: { name: 'name', label: 'name', type: 'text', visibility: 'guest', validation: {} },
      sku: { name: 'sku', label: 'sku', type: 'text', visibility: 'guest', validation: {} },
      active: { name: 'active', label: 'active', type: 'boolean', visibility: 'guest', validation: {} },
      launch: { name: 'launch', label: 'launch', type: 'date', visibility: 'guest', validation: {} },
      updated: { name: 'updated', label: 'updated', type: 'timestamp', visibility: 'guest', validation: {} },
      status: {
        name: 'status',
        label: 'status',
        type: 'select',
        visibility: 'guest',
        validation: { options: [{ value: 'a', label: 'A' }] },
      },
      brandId: {
        name: 'brandId',
        label: 'brandId',
        type: 'reference',
        visibility: 'guest',
        validation: { reference: 'brands' },
      },
      stock: { name: 'stock', label: 'stock', type: 'number', visibility: 'guest', validation: {} },
      notes: { name: 'notes', label: 'notes', type: 'textarea', visibility: 'guest', validation: {} },
    },
  });

  beforeEach(() => {
    listState.error = null;
    listState.rows = [
      { id: 'r1', image: null, name: 'Toner', sku: 'T-1', active: true, launch: null, updated: null, status: 'a', brandId: 'b1', stock: 3, notes: 'n' },
    ];
  });

  it('sizes columns by field type, pins the name, stacks phone rows from listCardFields', () => {
    render(<EntityList entity={presetEntity} basePath="/p" editable={false} />);
    const th = (name: string) =>
      screen.getAllByRole('columnheader').find((h) => h.textContent === name)!;
    expect(th('image').style.width).toBe('56px');
    expect(th('active').style.width).toBe('72px');
    expect(th('launch').style.width).toBe('112px');
    expect(th('updated').style.width).toBe('180px');
    expect(th('status').style.width).toBe('120px');
    expect(th('brandId').style.width).toBe('180px');
    expect(th('stock').getAttribute('data-align')).toBe('end');
    // First text field = the row name: flexible, min 240, pinned; later text fields are not
    expect(th('name').style.minWidth).toBe('240px');
    expect(th('name').style.width).toBe('');
    expect(th('name').getAttribute('data-sticky')).toBe('true');
    expect(th('sku').getAttribute('data-sticky')).toBeNull();
    // Long text: two lines
    expect(cellOf(0, 'notes').getAttribute('data-lines')).toBe('2');
    // Phones: listCardFields + the name stay, the others are left out
    expect(cellOf(0, 'image').getAttribute('data-phone')).toBeNull();
    expect(cellOf(0, 'stock').getAttribute('data-phone')).toBeNull();
    expect(cellOf(0, 'name').getAttribute('data-phone')).toBeNull();
    expect(cellOf(0, 'sku').getAttribute('data-phone')).toBe('hidden');
    expect(cellOf(0, 'notes').getAttribute('data-phone')).toBe('hidden');
  });
});
