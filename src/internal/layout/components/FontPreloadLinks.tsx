// packages/ui/src/internal/layout/components/FontPreloadLinks.tsx
/**
 * @fileoverview FontPreloadLinks - Server-only component for Next.js
 * @description Links public/dndev-fonts.css, the @font-face rules of the framework
 * fonts the app's theme uses (written at build by copyFontsToPublic). Renders nothing
 * when the theme uses none (an app that packs its own fonts). Include in the root
 * document's <head>.
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import type { ReactNode } from 'react';

const FONTS_CSS_FILENAME = 'dndev-fonts.css';

/**
 * Server component: `<link rel="stylesheet" href="/dndev-fonts.css">` when discovery
 * generated that file (the theme renders text in a framework font), else null.
 */
export async function FontPreloadLinks(): Promise<ReactNode> {
  try {
    await fs.access(path.join(process.cwd(), 'public', FONTS_CSS_FILENAME));
  } catch {
    // Not generated: the theme uses no framework font
    return null;
  }
  return <link rel="stylesheet" href={`/${FONTS_CSS_FILENAME}`} />;
}

export default FontPreloadLinks;
