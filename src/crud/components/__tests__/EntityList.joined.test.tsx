// packages/ui/src/crud/components/__tests__/EntityList.joined.test.tsx

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';


// EntityList with `parent` and an edit form open on that record: a display of
// useChildRows (no own Save, deferred delete, picker for link tables), plus the
// create-mode message and the app overrides (extraColumns, actions).

const LINES = [
  { id: 'l1', orderId: 'o1', productId: 'p1', quantity: 2 },
  { id: 'l2', orderId: 'o1', productId: 'p2', quantity: 3 },
];
const PRODUCTS = [
  { id: 'p1', name: 'Toner' },
  { id: 'p2', name: 'Cream' },
  { id: 'p3', name: 'Serum' },
  { id: 'p4', name: 'Mask' },
  { id: 'p5', name: 'Gone', status: 'deleted' },
];

const state = vi.hoisted(() => ({
  joinedForm: null as null | { formKey: string },
  extensionFields: [] as Array<Record<string, unknown>>,
  errors: {} as Record<string, Record<string, string>>,
  filterKeys: [] as string[],
  filtersProps: [] as Array<{ viewerRole?: string; filterKey?: string }>,
  changes: {} as Record<string, Record<string, unknown>>,
  pendingCount: 0,
  rows: {
    add: vi.fn(() => [] as string[]),
    update: vi.fn(),
    remove: vi.fn(),
    discard: vi.fn(),
    refresh: vi.fn(async () => {}),
  },
  bulk: vi.fn(async () => ({ insertedIds: [], updatedIds: [], deletedIds: [], failed: [] })),
}));

vi.mock('@donotdev/core', async (orig) => ({
  ...(await orig<object>()),
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) =>
      opts?.count !== undefined ? `${key}:${opts.count}` : key,
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
    jl_products: { p1: 'Toner', p2: 'Cream', p3: 'Serum', p4: 'Mask' },
  }),
  useCrud: () => ({ bulk: state.bulk }),
  useCrudPageSize: () => ({ pageSize: 12, setPageSize: vi.fn() }),
  useCrudList: (entity: { collection: string }) => {
    const items = entity.collection === 'jl_products' ? PRODUCTS : LINES;
    return {
      data: { items, total: items.length },
      items,
      processed: items,
      loading: false,
      mutate: vi.fn(),
      effectiveMode: 'client',
    };
  },
  EntityFilters: (props: { viewerRole?: string; filterKey?: string }) => {
    state.filtersProps.push(props);
    return <div data-testid="filters" />;
  },
  applyFilters: <T,>(items: T[]) => items,
  applySearch: <T,>(items: T[]) => items,
  useJoinedForm: () => state.joinedForm,
  useChildRows: () => ({
    items: LINES.map((row) => ({ ...row, ...state.changes[row.id] })),
    base: LINES,
    edits: { changes: state.changes, added: [], removed: [] },
    pendingCount: state.pendingCount,
    hasEdits: state.pendingCount > 0,
    loading: false,
    error: null,
    joined: state.joinedForm !== null,
    access: { create: true, update: true, delete: true },
    extensionFields: state.extensionFields,
    errors: state.errors,
    ...state.rows,
  }),
  useCrudFilters: (options: { collection: string }) => {
    state.filterKeys.push(options.collection);
    return { filters: {} };
  },
}));

import { EntityList } from '../EntityList';
import { joinedLineEntity as lineEntity, joinedNoteEntity as noteEntity, joinedNoteOfferEntity as offerEntity, joinedProductEntity } from '@dndev/test-entities';

// jl_products: the shared joinedProductEntity (the link table's other side), registered by the import.

/** Link table: one reference (productId) besides the parent's (orderId). */

/** Plain 1:N child (no other reference): add makes a blank row. */

/** Extension of notes (list fields drive its columns). */

const parent = { field: 'orderId', value: 'o1' };

beforeEach(() => {
  state.joinedForm = { formKey: 'form-1' };
  state.changes = {};
  state.pendingCount = 0;
  state.extensionFields = [];
  state.errors = {};
  state.filterKeys.length = 0;
  state.filtersProps.length = 0;
  for (const spy of Object.values(state.rows)) spy.mockClear();
  state.bulk.mockClear();
});

describe('EntityList joined to the parent form', () => {
  it('has no own Save: shows the pending count and Discard', () => {
    state.changes = { l1: { quantity: 5 } };
    state.pendingCount = 1;
    render(<EntityList entity={lineEntity} parent={parent} />);
    expect(screen.getByText('bulkEdit.pending:1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'actions.save' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'bulkEdit.discard' }));
    expect(state.rows.discard).toHaveBeenCalledOnce();
  });

  it('defers delete to the form Save', () => {
    render(<EntityList entity={lineEntity} parent={parent} />);
    fireEvent.click(screen.getAllByRole('checkbox')[0]!); // select all
    fireEvent.click(screen.getByRole('button', { name: 'bulkEdit.deleteSelected:2' }));
    expect(state.rows.remove).toHaveBeenCalledWith(['l1', 'l2']);
    expect(state.bulk).not.toHaveBeenCalled();
  });

  it('edits cells into the rows (not into a list Save)', () => {
    render(<EntityList entity={lineEntity} parent={parent} />);
    const product = screen.getAllByRole('combobox', { name: 'productId' })[0]!;
    fireEvent.change(product, { target: { value: 'p3' } });
    expect(state.rows.update).toHaveBeenCalledWith('l1', { productId: 'p3' });
  });

  it('adds a blank row to a plain child list', () => {
    render(<EntityList entity={noteEntity} parent={parent} />);
    fireEvent.click(screen.getByRole('button', { name: /addNew/ }));
    expect(state.rows.add).toHaveBeenCalledWith([{}]);
  });

  it('picks link table records: already linked excluded, multi-select', async () => {
    render(<EntityList entity={lineEntity} parent={parent} />);
    fireEvent.click(screen.getByRole('button', { name: /addNew/ }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByText('Serum')).toBeTruthy());
    expect(within(dialog).queryByText('Toner')).toBeNull();
    expect(within(dialog).queryByText('Cream')).toBeNull();
    const boxes = within(dialog).getAllByRole('checkbox');
    fireEvent.click(boxes[1]!); // Serum
    fireEvent.click(boxes[2]!); // Mask
    fireEvent.click(within(dialog).getByRole('button', { name: 'childRows.pickConfirm:2' }));
    expect(state.rows.add).toHaveBeenCalledWith([
      { productId: 'p3' },
      { productId: 'p4' },
    ]);
  });

  it('renders extraColumns from the row with unsaved edits, and app actions', () => {
    state.changes = { l1: { quantity: 5 } };
    render(
      <EntityList
        entity={lineEntity}
        parent={parent}
        extraColumns={[
          { key: 'total', title: 'Total', render: (row) => `total ${Number(row.quantity) * 10}` },
        ]}
        actions={<button type="button">Add the brand products</button>}
      />
    );
    expect(screen.getByText('total 50')).toBeTruthy();
    expect(screen.getByText('total 30')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add the brand products' })).toBeTruthy();
  });
});

describe('EntityList read-only (editable={false})', () => {
  it('next to an open parent form: standalone, no Add, no selection, no delete', () => {
    render(<EntityList entity={lineEntity} parent={parent} editable={false} />);
    expect(screen.queryByRole('link', { name: /addNew/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /addNew/ })).toBeNull();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(state.rows.remove).not.toHaveBeenCalled();
  });

  it('without a form: no Add, no selection, rows still open', () => {
    state.joinedForm = null;
    render(<EntityList entity={lineEntity} editable={false} basePath="/lines" />);
    expect(screen.queryByRole('link', { name: /addNew/ })).toBeNull();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getAllByRole('link', { name: 'actions.open' })[0]!.getAttribute('href')).toBe('/lines/l1');
  });
});

describe('EntityList joined: all lines, nothing else', () => {
  it('has no filters section, search, export or pagination; Add never navigates', () => {
    render(<EntityList entity={noteEntity} parent={parent} />);
    expect(screen.queryByText('filters.title')).toBeNull();
    expect(screen.queryByPlaceholderText('actions.searchPlaceholder')).toBeNull();
    expect(screen.queryByRole('button', { name: 'export' })).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('link', { name: /addNew/ })).toBeNull();
    expect(screen.getByRole('button', { name: /addNew/ }).getAttribute('type')).toBe('button');
  });
});

describe('EntityList picker rules', () => {
  it('filters for the viewer role with their own key, excludes deleted records, searches', async () => {
    render(<EntityList entity={lineEntity} parent={parent} />);
    fireEvent.click(screen.getByRole('button', { name: /addNew/ }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByText('Serum')).toBeTruthy());
    expect(within(dialog).queryByText('Gone')).toBeNull();
    expect(state.filtersProps.at(-1)).toMatchObject({ viewerRole: 'admin', filterKey: 'jl_products#picker' });
    expect(state.filterKeys).toContain('jl_products#picker');
    expect(state.filterKeys).not.toContain('jl_products');
    expect(within(dialog).getByPlaceholderText('actions.searchPlaceholder')).toBeTruthy();
  });
});

describe('EntityList extend', () => {
  it('shows extension columns (prefixed, from the extension list fields) with own Save mode', () => {
    state.joinedForm = null;
    state.extensionFields = [
      {
        name: 'offer.price',
        config: { name: 'offer.price', label: 'price', type: 'number', visibility: 'admin' },
        editable: true,
        scope: 'offer',
      },
    ];
    render(
      <EntityList
        entity={noteEntity}
        extend={{ offer: { entity: offerEntity, field: 'noteId' } }}
      />
    );
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toContain('offer.price');
    // Standalone with extend: own Save once something is pending, filters and search shown.
    expect(screen.getByText('filters.title')).toBeTruthy();
    expect(screen.getByPlaceholderText('actions.searchPlaceholder')).toBeTruthy();
  });
});

describe('EntityList row errors', () => {
  it('marks the cells of rows.errors with their message', () => {
    state.errors = { l1: { quantity: 'quantity is not valid' } };
    render(<EntityList entity={lineEntity} parent={parent} />);
    const quantity = screen.getAllByRole('textbox', { name: 'quantity' })[0]!;
    expect(quantity.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('quantity is not valid')).toBeTruthy();
  });
});

describe('EntityList parent not created yet', () => {
  it('only shows the create-first message', () => {
    state.joinedForm = null;
    render(<EntityList entity={lineEntity} parent={{ field: 'orderId', value: null }} />);
    expect(screen.getByText('crud:childRows.createFirst')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('EntityList standalone overrides', () => {
  it('renders extraColumns and actions without a form', () => {
    state.joinedForm = null;
    render(
      <EntityList
        entity={lineEntity}
        parent={parent}
        extraColumns={[{ key: 'total', title: 'Total', render: (row) => `total ${Number(row.quantity) * 10}` }]}
        actions={<button type="button">Act</button>}
      />
    );
    expect(screen.getByText('total 20')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Act' })).toBeTruthy();
    // Standalone: the add button still opens the create page.
    expect(screen.getByRole('link', { name: /addNew/ }).getAttribute('href')).toBe(
      '/jl_lines/new?orderId=o1'
    );
  });
});
