// packages/ui/src/crud/components/__tests__/EntityList.test.tsx

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { defineEntity } from '@donotdev/core';

// Admin list UX: open-link icon | bulk-select checkbox | fields edited in their
// cells; nested list of a parent's children; bulk delete of checked rows.

const ROWS = [
  { id: 'p1', name: 'Toner', brandId: 'b1', categoryId: 'c1' },
  { id: 'p2', name: 'Cream', brandId: 'b1', categoryId: 'c2' },
];

const { listSpy, bulkSpy } = vi.hoisted(() => ({
  listSpy: vi.fn(),
  bulkSpy: vi.fn(async () => ({
    insertedIds: [],
    updatedIds: [],
    deletedIds: [],
    failed: [] as Array<{ op: string; id?: string; error: string }>,
  })),
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
  isFieldEditable: () => true,
  formatValue: (value: unknown) => String(value ?? ''),
  useReferenceResolver: () => ({
    brands: { b1: 'Findive', b2: 'Cerolabs' },
    categories: { c1: 'Toners', c2: 'Creams' },
  }),
  useCrud: () => ({ bulk: bulkSpy }),
  useCrudFilters: () => ({ filters: {} }),
  useCrudPageSize: () => ({ pageSize: 12, setPageSize: vi.fn() }),
  useCrudList: (_entity: unknown, options: unknown) => {
    listSpy(options);
    return {
      data: { items: ROWS, total: ROWS.length },
      items: ROWS,
      processed: ROWS,
      loading: false,
      mutate: vi.fn(),
      effectiveMode: 'client',
    };
  },
  EntityFilters: ({ fieldsToFilter }: { fieldsToFilter: string[] }) => (
    <div data-testid="filters">{fieldsToFilter.join(',')}</div>
  ),
}));

import { EntityList } from '../EntityList';

const productEntity = defineEntity({
  name: 'Product',
  collection: 'products',
  namespace: 'entity-product',
  listFields: ['name', 'brandId', 'categoryId'],
  fields: {
    name: { name: 'name', label: 'name', type: 'text', visibility: 'admin' },
    brandId: {
      name: 'brandId',
      label: 'brandId',
      type: 'reference',
      visibility: 'admin',
      validation: { reference: 'brands' },
    },
    categoryId: {
      name: 'categoryId',
      label: 'categoryId',
      type: 'reference',
      visibility: 'admin',
      validation: { reference: 'categories' },
    },
  },
});

const headers = () =>
  screen.getAllByRole('columnheader').map((th) => th.textContent);

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
    // Reference cell is a dropdown of resolved labels, current value selected
    const brandCell = screen.getAllByRole('combobox', { name: 'brandId' })[0]!;
    expect((brandCell as HTMLSelectElement).value).toBe('b1');
    expect(
      [...(brandCell as HTMLSelectElement).options].map((o) => o.textContent)
    ).toContain('Cerolabs');
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

describe('EntityList partial bulk save', () => {
  beforeEach(() => bulkSpy.mockClear());

  it('keeps failed rows pending and shows their count; saved rows leave', async () => {
    bulkSpy.mockResolvedValueOnce({
      insertedIds: [],
      updatedIds: ['p1'],
      deletedIds: [],
      failed: [{ op: 'update', id: 'p2', error: 'denied' }],
    });
    render(<EntityList entity={productEntity} basePath="/produits" />);
    const brandCells = screen.getAllByRole('combobox', { name: 'brandId' });
    fireEvent.change(brandCells[0]!, { target: { value: 'b2' } });
    fireEvent.change(brandCells[1]!, { target: { value: 'b2' } });
    expect(screen.getByText('bulkEdit.pending:2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'actions.save' }));

    expect(await screen.findByText('bulkEdit.failed:1')).toBeTruthy();
    expect(bulkSpy).toHaveBeenCalledWith({
      updates: [
        { id: 'p1', patch: { brandId: 'b2' } },
        { id: 'p2', patch: { brandId: 'b2' } },
      ],
    });
    // p2 stays pending, p1 is saved
    expect(screen.getByText('bulkEdit.pending:1')).toBeTruthy();
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
