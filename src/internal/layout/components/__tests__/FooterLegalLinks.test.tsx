// packages/ui/src/internal/layout/components/__tests__/FooterLegalLinks.test.tsx

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@donotdev/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@donotdev/core')>()),
  useTranslation: () => ({ t: (key: string) => key }),
  maybeTranslate: (_t: unknown, label: string) => label,
  useAppConfig: () => null,
  getPlatformEnvVar: () => 'https://shop.example',
}));
vi.mock('../../../../components/cookie-consent/useCookieNoticeRequired', () => ({
  useCookieNoticeRequired: () => false,
}));
vi.mock('../../../../routing/Link', () => ({
  Link: ({ path, children, ...props }: { path: string; children: unknown }) => (
    <a href={path} {...(props as object)}>
      {children as never}
    </a>
  ),
}));

import { FooterLegalLinks } from '../footer/FooterLegalLinks';

afterEach(cleanup);

// Regression (shop review): the legal links were hand-styled anchors (16px high, an
// inline copy of the link look) and the branding link sized its icon in px.
describe('FooterLegalLinks', () => {
  it('renders every link, branding included, as the Button link variant', () => {
    render(
      <FooterLegalLinks
        app={{
          footer: {
            legalLinks: [
              { path: '/legal/cgv', label: 'CGV' },
              { path: '/legal/privacy', label: 'Privacy' },
            ],
          },
        }}
      />
    );
    for (const name of ['CGV', 'Privacy', 'DoNotDev']) {
      const link = screen.getByRole('link', { name });
      expect(link.getAttribute('data-variant')).toBe('link');
      expect(link.classList.contains('dndev-interactive')).toBe(true);
    }
    // The legal links take the footer's text size from their group, no style of their own
    for (const name of ['CGV', 'Privacy']) {
      expect(screen.getByRole('link', { name }).getAttribute('style')).toBeNull();
    }
    expect(
      screen.getByRole('link', { name: 'CGV' }).getAttribute('href')
    ).toBe('/legal/cgv');
    const branding = screen.getByRole('link', { name: 'DoNotDev' });
    expect(branding.getAttribute('target')).toBe('_blank');
    expect(branding.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
