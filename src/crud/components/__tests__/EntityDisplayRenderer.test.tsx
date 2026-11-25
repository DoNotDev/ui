// packages/ui/src/crud/components/__tests__/EntityDisplayRenderer.test.tsx

/**
 * @fileoverview Detail page (audit 2026-11-25 #8): header (name, status badge, Edit /
 * Delete), label | value grid grouped by `field.group`, references resolved to their
 * label, empty fields as "—", translated errors (no raw error message).
 */

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DisplayThumbnail } from '../../../../../features/crud/src/components/DisplayThumbnail';
import { formatValue } from '../../../../../features/crud/src/components/DisplayFieldRenderer';
import {
  translateFieldLabel,
  translateLabel,
} from '../../../../../features/crud/src/forms/utils/translateFieldLabel';

const { doc, removeSpy, role } = vi.hoisted(() => ({
  doc: {
    data: null as Record<string, unknown> | null,
    error: null as Error | null,
    refresh: vi.fn(async () => undefined),
  },
  removeSpy: vi.fn(async () => undefined),
  role: { current: 'admin' as string | undefined },
}));

vi.mock('@donotdev/core', async (orig) => ({
  ...(await orig<object>()),
  useTranslation: () => ({
    t: (key: string, opts?: { entity?: string }) =>
      opts?.entity ? `${key}:${opts.entity}` : key,
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
vi.mock('../../../utils/useAuthSafe', () => ({ useAuthSafe: () => role.current }));
vi.mock('../useRecordBreadcrumb', () => ({ useRecordBreadcrumb: () => {} }));
vi.mock('../../crudImports', () => ({
  isCrudModuleAvailable: true,
  formatValue,
  translateFieldLabel,
  translateLabel,
  DisplayThumbnail,
  useCrud: () => ({ remove: removeSpy }),
  useCrudDoc: () => ({
    data: doc.data,
    loading: false,
    error: doc.error,
    notFound: !doc.data && !doc.error,
    refresh: doc.refresh,
  }),
  useReferenceResolver: () => ({
    suppliers: { 'sup-beiersdorf': 'Beiersdorf' },
  }),
}));

import { defineEntity } from '@donotdev/core';

import { EntityDisplayRenderer } from '../EntityDisplayRenderer';

const productEntity = defineEntity({
  name: 'DetailProduct',
  collection: 'detail_products',
  fields: {
    name: { name: 'name', label: 'name', type: 'text', visibility: 'guest' },
    supplierId: {
      name: 'supplierId',
      label: 'supplierId',
      type: 'reference',
      visibility: 'guest',
      validation: { reference: 'suppliers' },
    },
    notes: { name: 'notes', label: 'notes', type: 'textarea', visibility: 'guest' },
    sku: {
      name: 'sku',
      label: 'sku',
      type: 'text',
      visibility: 'guest',
      group: { name: 'logistics', title: 'Logistics' },
    },
  },
});

const RECORD = {
  id: 'prd-004',
  name: 'Birch Juice Eye Cream',
  supplierId: 'sup-beiersdorf',
  notes: null,
  sku: 'CRE-1028',
  status: 'draft',
};

afterEach(cleanup);
beforeEach(() => {
  doc.data = RECORD;
  doc.error = null;
  role.current = 'admin';
  removeSpy.mockClear();
});

/** The value (dd) next to the label (dt) `label`. */
const valueOf = (label: string) =>
  screen.getByText(label, { selector: 'dt *' }).closest('dt')!
    .nextElementSibling as HTMLElement;

describe('EntityDisplayRenderer', () => {
  it('heads the page with the record name, status badge and Edit / Delete', () => {
    render(<EntityDisplayRenderer entity={productEntity} id="prd-004" basePath="/products" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Birch Juice Eye Cream'
    );
    const badges = document.querySelectorAll('[data-variant="muted"]');
    expect([...badges].some((b) => b.textContent === 'status.draft')).toBe(true);
    expect(
      screen.getByRole('link', { name: 'actions.edit' }).getAttribute('href')
    ).toBe('/products/prd-004/edit');
    expect(screen.getByRole('button', { name: 'actions.delete' })).toBeTruthy();
  });

  it('shows a reference as its label, not its id', () => {
    render(<EntityDisplayRenderer entity={productEntity} id="prd-004" />);
    expect(valueOf('supplierId').textContent).toBe('Beiersdorf');
    expect(screen.queryByText('sup-beiersdorf')).toBeNull();
  });

  it('shows empty fields as a muted dash', () => {
    render(<EntityDisplayRenderer entity={productEntity} id="prd-004" />);
    expect(valueOf('notes').textContent).toBe('—');
  });

  it('lays fields out as label | value pairs, grouped by field.group', () => {
    render(<EntityDisplayRenderer entity={productEntity} id="prd-004" />);
    const group = screen.getByRole('heading', { name: 'Logistics' });
    const section = group.parentElement!;
    expect(within(section).getByRole('term').textContent).toBe('sku');
    expect(within(section).getByRole('definition').textContent).toBe('CRE-1028');
  });

  it('hides Edit / Delete from viewers below the entity\'s update / delete role', () => {
    role.current = 'guest';
    render(<EntityDisplayRenderer entity={productEntity} id="prd-004" />);
    expect(screen.queryByRole('link', { name: 'actions.edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'actions.delete' })).toBeNull();
  });

  it('hides the actions with hideActions', () => {
    render(<EntityDisplayRenderer entity={productEntity} id="prd-004" hideActions />);
    expect(screen.queryByRole('link', { name: 'actions.edit' })).toBeNull();
  });

  it('shows a translated load error, never the raw error message', () => {
    doc.data = null;
    doc.error = new Error('permission denied for table detail_products');
    render(<EntityDisplayRenderer entity={productEntity} id="prd-004" />);
    expect(screen.getByText('errors.fetchFailed:name')).toBeTruthy();
    expect(screen.queryByText(/permission denied/)).toBeNull();
  });

  // Owner decision 2026-11-25 E1: the list's load error, with its reason and Retry
  it('shows the reason and retries the read (useCrudDoc refresh)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    doc.data = null;
    doc.error = new Error('permission denied for table detail_products');
    doc.refresh.mockClear();
    render(<EntityDisplayRenderer entity={productEntity} id="prd-004" />);
    expect(screen.getByRole('alert').textContent).toContain('messages.error');
    fireEvent.click(screen.getByRole('button', { name: 'routeError.tryAgain' }));
    expect(doc.refresh).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
