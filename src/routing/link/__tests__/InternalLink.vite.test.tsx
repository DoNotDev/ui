// packages/ui/src/routing/link/__tests__/InternalLink.vite.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@donotdev/ui/routing/hooks', () => ({
  useNavigate: () => navigate,
  useLocalizedPath: () => (path: string) => `/en${path}`,
}));

import { InternalLink } from '../InternalLink.vite';

beforeEach(() => navigate.mockReset());

describe('InternalLink (Vite, react-router)', () => {
  it('renders a real <a href> in the current language', () => {
    render(<InternalLink path="/produits">Produits</InternalLink>);
    expect(screen.getByRole('link', { name: 'Produits' }).getAttribute('href')).toBe(
      '/en/produits'
    );
  });

  it('plain left click: prevents the page load, calls onClick, navigates with replace', () => {
    const onClick = vi.fn();
    render(
      <InternalLink path="produits" replace onClick={onClick}>
        Produits
      </InternalLink>
    );
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    screen.getByRole('link').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/produits', { replace: true });
  });

  it('modifier click keeps the browser default (new tab) and still calls onClick', () => {
    const onClick = vi.fn();
    render(
      <InternalLink path="/produits" onClick={onClick}>
        Produits
      </InternalLink>
    );
    fireEvent.click(screen.getByRole('link'), { ctrlKey: true });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('passes anchor attributes through', () => {
    render(
      <InternalLink path="/a" className="nav" aria-label="Accueil" data-testid="l">
        A
      </InternalLink>
    );
    const link = screen.getByTestId('l');
    expect(link.className).toBe('nav');
    expect(link.getAttribute('aria-label')).toBe('Accueil');
  });
});
