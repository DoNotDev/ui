// packages/ui/src/internal/layout/components/__tests__/FontHead.test.tsx
/**
 * @vitest-environment node
 */

import { renderToReadableStream } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@donotdev/core', async () => {
  // FontHead keys its style with the shared head-tag constant (same as the Vite build)
  return import('../../../../../../core/utils/src/common/headTags');
});

import { FontHead } from '../FontHead';

const FONTS = {
  css: "@font-face{font-family:'Inter';font-display:optional;src:url(/fonts/inter-latin-400-normal.1a2b3c4d.woff2) format('woff2');}",
  preloads: {
    en: ['/fonts/inter-latin-400-normal.1a2b3c4d.woff2', '/fonts/inter-latin-700-normal.5e6f7a8b.woff2'],
    pl: ['/fonts/inter-latin-ext-400-normal.9c0d1e2f.woff2'],
  },
};

/** The server HTML of a document like the generated root layout renders it. */
async function serverHtml(lang: string, fonts = FONTS): Promise<string> {
  const stream = await renderToReadableStream(
    <html lang={lang}>
      <head>
        <link rel="stylesheet" href="/_next/static/chunks/app.css" precedence="next" />
      </head>
      <body>
        <FontHead fonts={fonts} lang={lang} />
        <p>page</p>
      </body>
    </html>
  );
  await stream.allReady;
  return new Response(stream).text();
}

describe('FontHead', () => {
  it('writes the language preloads in <head>, before the first stylesheet, then the inline @font-face', async () => {
    const html = await serverHtml('en');
    const head = html.slice(0, html.indexOf('</head>'));
    const preloads = [...head.matchAll(/<link rel="preload"[^>]*>/g)].map((m) => m[0]);
    expect(preloads).toHaveLength(2);
    for (const [i, link] of preloads.entries()) {
      expect(link).toContain(`href="${FONTS.preloads.en[i]}"`);
      expect(link).toContain('as="font"');
      expect(link).toContain('type="font/woff2"');
      // React writes crossOrigin 'anonymous' as the bare attribute (same CORS mode)
      expect(link).toMatch(/ crossorigin(="(anonymous)?")?/);
    }
    const stylesheet = head.indexOf('rel="stylesheet"');
    expect(stylesheet).toBeGreaterThan(-1);
    expect(head.indexOf(preloads[1]!)).toBeLessThan(stylesheet);
    // The style is hoisted into <head> once, keyed dndev-fonts
    expect(head).toContain('data-href="dndev-fonts"');
    expect(head).toContain('font-display:optional');
    expect(html.match(/data-href="dndev-fonts"/g)).toHaveLength(1);
  });

  it("preloads the page language's files", async () => {
    const html = await serverHtml('pl');
    expect(html).toContain('inter-latin-ext-400-normal.9c0d1e2f.woff2');
    expect(html).not.toContain('inter-latin-700');
  });

  it('a system-font plan renders nothing', async () => {
    const html = await serverHtml('en', { css: '', preloads: { en: [] } });
    expect(html).not.toContain('as="font"');
    expect(html).not.toContain('dndev-fonts');
  });

  it('fails on a language the plan does not know (stale generated file)', async () => {
    await expect(serverHtml('de')).rejects.toThrow("no preloads for language 'de'");
  });
});
