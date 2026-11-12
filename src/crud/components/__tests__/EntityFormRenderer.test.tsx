// packages/ui/src/crud/components/__tests__/EntityFormRenderer.test.tsx

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { describe, it, expect, vi } from 'vitest';

import { defineEntity } from '@donotdev/core';

// `hideVisibilityInfo` hides the developer-facing visibility tooling: the field
// badges AND the View-As ("Preview: <role>") selector (contract in
// core/types crud/components.ts). Regression: the selector ignored the prop.

vi.mock('@donotdev/core', async (orig) => ({
  ...(await orig<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../routing', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../../utils/useAuthSafe', () => ({ useAuthSafe: () => 'admin' }));
vi.mock('../useRecordBreadcrumb', () => ({ useRecordBreadcrumb: () => {} }));
vi.mock('../../crudImports', () => ({
  isCrudModuleAvailable: true,
  DisplayFieldRenderer: () => null,
  FormFieldRenderer: ({ name }: { name: string }) => <input aria-label={name} />,
  UploadProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
  useEntityForm: () => {
    const form = useForm();
    return {
      ...form,
      fields: [
        {
          name: 'name',
          config: { name: 'name', label: 'name', type: 'text', visibility: 'admin' },
        },
      ],
      formStatus: 'idle',
      uploadProgress: null,
      isDirty: false,
      hasUserInteracted: false,
      resetForm: vi.fn(),
    };
  },
  useFormStore: { getState: () => ({ setIsDirty: vi.fn() }) },
  useFieldConditions: () => ({}),
}));

import { EntityFormRenderer } from '../EntityFormRenderer';

const entity = defineEntity({
  name: 'Product',
  collection: 'products',
  namespace: 'entity-product',
  fields: {
    name: { name: 'name', label: 'name', type: 'text', visibility: 'admin' },
  },
});

const PREVIEW = /visibility\.preview/;

describe('EntityFormRenderer View-As selector', () => {
  it('shows the View-As selector to an admin by default', () => {
    render(<EntityFormRenderer entity={entity} operation="create" onSubmit={vi.fn()} />);
    expect(screen.queryByText(PREVIEW)).not.toBeNull();
  });

  it('hides the View-As selector with hideVisibilityInfo', () => {
    render(
      <EntityFormRenderer entity={entity} operation="create" onSubmit={vi.fn()} hideVisibilityInfo />
    );
    expect(screen.queryByText(PREVIEW)).toBeNull();
  });
});
