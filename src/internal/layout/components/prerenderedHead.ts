// packages/ui/src/internal/layout/components/prerenderedHead.ts

/**
 * @fileoverview Head of a prerendered page (Vite)
 * @description The Vite build writes one static HTML per public page (static route, blog
 * post, entity record) and language, with the identity tags it holds embedded as data
 * (`<script type="application/json" id="dndev-prerendered-head">`). AutoMetaTags renders
 * exactly those tags on that page's URL, so the head after the app loads is the one the
 * build wrote, node for node. Any other URL (client navigation, a record published after
 * the build) gets the route's identity (PageMeta + i18n).
 *
 * @version 0.2.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */

import { PRERENDERED_HEAD_ELEMENT_ID } from '@donotdev/core';
import type { PrerenderedHead } from '@donotdev/core';

/** The document's embedded head: read once (it never changes after load). */
let embedded: PrerenderedHead | null | undefined;

/**
 * The prerendered head of the page at `url`, when the loaded document is that page's
 * static HTML.
 *
 * @param url - Canonical URL of the current page (`languageUrl`)
 * @returns The head the build embedded, or null (another URL, no prerendered page,
 *   server render)
 *
 * @version 0.2.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */
export function prerenderedHead(url: string): PrerenderedHead | null {
  if (typeof document === 'undefined') return null;
  if (embedded === undefined) {
    const text = document.getElementById(PRERENDERED_HEAD_ELEMENT_ID)?.textContent;
    // Written by the build (jsonScriptText of the page's PrerenderedHead)
    const head: PrerenderedHead | null = text ? JSON.parse(text) : null;
    embedded = head;
  }
  return embedded?.url === url ? embedded : null;
}
