// packages/ui/src/internal/layout/components/FontHead.tsx

/**
 * @fileoverview Font tags of a Next app's document
 * @description Renders the app's font plan (built at build time by `@donotdev/core`
 * config `fonts/buildFontPlan.js`, generated into `src/app/fonts.generated.ts`) into the
 * server HTML: the font preloads of the page language through React's `preload()`
 * (React writes font preloads at the top of `<head>`, before every stylesheet, as Next's
 * own font pipeline does) and one inline `<style>` with every `@font-face` (hoisted
 * into `<head>` and deduplicated by React: `href` + `precedence`). Rendered only by the
 * generated root layout and global 404, never by app code. Server-safe: no `fs`, no
 * effect, no `'use client'`. Vite writes the same tags into `index.html` and every
 * prerendered page (`createViteFontPlugin`).
 *
 * @version 0.1.0
 * @since 0.3.3
 * @author AMBROISE PARK Consulting
 */

import { preload } from 'react-dom';

import { FONT_STYLE_ID } from '@donotdev/core';

/**
 * The font plan as the document head needs it (`src/app/fonts.generated.ts`).
 *
 * @version 0.1.0
 * @since 0.3.3
 * @author AMBROISE PARK Consulting
 */
export interface FontHeadData {
  /** Every `@font-face` of the app (web faces, then the size-matched fallback faces) */
  readonly css: string;
  /** Per app language: the first-paint font file URLs */
  readonly preloads: Readonly<Record<string, readonly string[]>>;
}

/**
 * Font preloads of `lang` and the inline `@font-face` style.
 *
 * @param props.fonts - The generated font plan (`FONTS` of `fonts.generated.ts`)
 * @param props.lang - The page language
 * @returns The `<style>` element (null when the theme uses system fonts only)
 * @throws {Error} When the plan has no entry for `lang` (the generated file is stale)
 *
 * @version 0.1.0
 * @since 0.3.3
 * @author AMBROISE PARK Consulting
 */
export function FontHead({ fonts, lang }: { fonts: FontHeadData; lang: string }) {
  const hrefs = fonts.preloads[lang];
  if (!hrefs) {
    throw new Error(
      `[dndev] FontHead: the font plan has no preloads for language '${lang}' (src/app/fonts.generated.ts is stale: rebuild).`
    );
  }
  for (const href of hrefs) {
    preload(href, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  }
  if (!fonts.css) return null;
  return (
    <style href={FONT_STYLE_ID} precedence={FONT_STYLE_ID}>
      {fonts.css}
    </style>
  );
}
