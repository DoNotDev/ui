// packages/ui/src/crud/components/__tests__/FormLabel.test.tsx

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { cleanup, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it } from 'vitest';

import { Form, FormField, FormItem, FormLabel } from '../Form';

afterEach(cleanup);

function Field({ error }: { error: boolean }) {
  const form = useForm({ defaultValues: { name: '' } });
  useEffect(() => {
    if (error) form.setError('name', { type: 'required', message: 'Required' });
  }, [error, form]);
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="name"
        render={() => (
          <FormItem>
            <FormLabel>Name</FormLabel>
          </FormItem>
        )}
      />
    </Form>
  );
}

// Regression: the label got Tailwind `text-destructive`, which no CSS defines: never red.
describe('FormLabel error state', () => {
  it('sets data-state="error" while the field is in error', async () => {
    render(<Field error />);
    const label = await screen.findByText('Name');
    expect(label.getAttribute('data-state')).toBe('error');
    expect(label.className).not.toContain('text-destructive');
  });

  it('sets no state without an error', () => {
    render(<Field error={false} />);
    expect(screen.getByText('Name').hasAttribute('data-state')).toBe(false);
  });

  it('Label.css colours the error state', () => {
    const css = readFileSync(
      resolve(__dirname, '../../../../../components/src/atomic/Label/Label.css'),
      'utf-8'
    );
    expect(css).toMatch(
      /\.dndev-label-base\[data-state='error'\]\s*\{\s*color: var\(--destructive\);/
    );
  });
});
