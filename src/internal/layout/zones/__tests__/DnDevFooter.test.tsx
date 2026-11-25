// packages/ui/src/internal/layout/zones/__tests__/DnDevFooter.test.tsx

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@donotdev/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@donotdev/core')>()),
  // The footer layout must not depend on a breakpoint hook (server default: desktop)
  useBreakpoint: () => {
    throw new Error('DnDevFooter must not read the breakpoint');
  },
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

import { DnDevFooter } from '../DnDevFooter';

const layoutCss = readFileSync(
  resolve(__dirname, '../../../../styles/layout-variables.css'),
  'utf8'
);
const layoutSource = readFileSync(
  resolve(__dirname, '../../DnDevLayout.tsx'),
  'utf8'
);

// Regression (shop review, signed-out 404 at 375px): the footer rendered the desktop row
// on the server and swapped to the stacked layout after hydration (79 → 244px).
describe('DnDevFooter', () => {
  it('renders one CSS-driven wrapping row: copyright, then the links group', () => {
    const html = renderToStaticMarkup(
      <DnDevFooter
        app={{
          name: 'Shop',
          footer: { legalLinks: [{ path: '/legal/cgv', label: 'CGV' }] },
        }}
      />
    );
    expect(html).toMatch(
      /<footer role="contentinfo" class="footer"><div class="dndev-stack" data-direction="row" data-align="center" data-justify="between" data-gap="tight" data-wrap="wrap"/
    );
    expect(html).toContain('footer-copyright');
    expect(html).toContain('href="/legal/cgv"');
    expect(html).toContain('DoNotDev');
  });

  it('keeps the branding link when the app has no legal links', () => {
    const html = renderToStaticMarkup(
      <DnDevFooter app={{ name: 'Shop', footer: { legalLinks: [] } }} />
    );
    expect(html).toContain('DoNotDev');
  });
});

// Regressions (shop review): the page-fills-main rule targeted main's first child (a
// streaming Suspense <template> took that place), and main had no stable scrollbar gutter.
describe('main layout rules', () => {
  it('grows the page slot by class, not by position', () => {
    expect(layoutCss).toMatch(/& > \.dndev-page \{\s*flex: 1 0 auto;/);
    expect(layoutCss).not.toMatch(/& > :first-child:not\(\.breadcrumbs-container/);
  });

  it('reserves the scrollbar gutter on the scroll container', () => {
    expect(layoutCss).toMatch(
      /main\[role='main'\] \{\s*grid-area: main;\s*overflow-y: auto;[^}]*scrollbar-gutter: stable;/
    );
  });
});

// Regression (shop, desktop Chrome, classic 10px scrollbar): full-width Sections were
// `100vw` wide (gutter included): main overflowed by 5px and the content sat 5px left of
// the header logo; the header (outside main) spanned the gutter, ending 10px past the content.
describe('page geometry from main, not the viewport', () => {
  it('makes main the inline-size container that page-wide elements measure', () => {
    expect(layoutCss).toMatch(
      /main\[role='main'\] \{\s*grid-area: main;[^}]*container-type: inline-size;/
    );
  });

  it('sizes the PageContainer breakthrough from main (cqi), never the viewport', () => {
    expect(layoutCss).toMatch(
      /\.dndev-container > \.dndev-tech-bento \{[^}]*width: var\(--page-bleed-width\);\s*max-width: var\(--page-bleed-width\);\s*margin-inline: var\(--page-bleed-margin\);/
    );
    expect(layoutCss).toMatch(
      /\.dndev-container > \.dndev-hero-section--bg-contain \{[^}]*width: var\(--page-bleed-width\);\s*max-width: var\(--page-bleed-width\);\s*margin-inline: var\(--page-bleed-margin\);/
    );
    expect(layoutCss).not.toMatch(/^\s*(max-)?width:[^;]*\d+d?vw/m);
    expect(layoutCss).not.toMatch(/^\s*margin-inline:[^;]*\d+d?vw/m);
  });

  it("reserves main's scrollbar gutter beside the header and footer in a grid column", () => {
    expect(layoutCss).toMatch(
      /\.dndev-layout \{[^}]*grid-template-areas:\s*'header header gutter'\s*'sidebar main main'\s*'footer footer \.';[^}]*grid-template-columns: var\(--sidebar-width\) 1fr auto;/
    );
    expect(
      layoutCss.match(/'header header gutter'\s*'sidebar main main';/g)
    ).toHaveLength(2);
    expect(layoutCss).not.toMatch(/'header header'/);
    expect(layoutCss).toMatch(
      /\.dndev-scroll-gutter \{\s*grid-area: gutter;\s*overflow: hidden;\s*scrollbar-gutter: stable;\s*\}/
    );
    // The footer stays in its area (no full-row span over the gutter column)
    expect(layoutCss).toMatch(
      /footer\[role='contentinfo'\] \{[^}]*grid-area: footer;/
    );
    expect(layoutCss).not.toMatch(/grid-column: 1 \/ -1;/);
    expect(layoutSource).toContain(
      '<div className="dndev-scroll-gutter" aria-hidden="true" />'
    );
  });
});
