// packages/ui/src/components/common/__tests__/iconByName.test.tsx

import { render, waitFor } from '@testing-library/react';
import { Gem, Palette } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('@donotdev/core', () => ({ getDndevConfig: () => config.value }));

import { iconByName } from '../iconByName';
import { toDynamicIconName } from '../LazyLucideIcon';

afterEach(() => {
  config.value = null;
});

describe('iconByName', () => {
  it('theme icon from the build-time registry: the imported component itself', () => {
    config.value = { themes: { icons: { Gem } } };
    expect(iconByName("'Gem'", Palette)).toBe(Gem);
  });

  it('registered theme icon server-renders its svg', () => {
    config.value = { themes: { icons: { Gem } } };
    const Icon = iconByName('Gem', Palette);
    expect(renderToString(<Icon className="x" />)).toContain('lucide-gem');
  });

  it('other names: one stable lazy component per name', () => {
    expect(iconByName('Rocket', Palette)).toBe(iconByName('Rocket', Palette));
    expect(iconByName('Rocket', Palette)).not.toBe(iconByName('Anchor', Palette));
  });

  it('lazy icon loads its own chunk and renders the svg', async () => {
    const Icon = iconByName('Rocket', Palette);
    const { container } = render(<Icon className="dndev-size-md" />);
    await waitFor(() => expect(container.querySelector('svg')).not.toBeNull());
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('dndev-size-md');
  });

  it('unknown name renders the fallback icon', async () => {
    const Icon = iconByName('NotAnIcon', Palette);
    const { container } = render(<Icon />);
    await waitFor(() =>
      expect(container.querySelector('svg')?.getAttribute('class')).toContain('lucide-palette')
    );
  });
});

describe('toDynamicIconName', () => {
  it('maps export names, aliases and suffixed spellings to dynamic names', () => {
    expect(toDynamicIconName('Sun')).toBe('sun');
    expect(toDynamicIconName('SunIcon')).toBe('sun');
    expect(toDynamicIconName('LucideSun')).toBe('sun');
    // lucide ships both arrow-down-01 and its alias arrow-down-0-1 (same icon)
    expect(toDynamicIconName('ArrowDown01')).toMatch(/^arrow-down-0-?1$/);
    expect(toDynamicIconName('Heading1')).toBe('heading-1');
    expect(toDynamicIconName('Grid2x2')).toBe('grid-2x2');
    expect(toDynamicIconName('Nope')).toBeUndefined();
  });
});
