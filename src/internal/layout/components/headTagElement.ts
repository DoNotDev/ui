// packages/ui/src/internal/layout/components/headTagElement.ts

/**
 * @fileoverview A shared head tag as a React element
 * @description Maps one `HeadTag` of the shared builders (`@donotdev/core` headTags) to
 * the element `HeadTags` hoists into `<head>`: AutoMetaTags (SEO) and FaviconHead.
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */

import { createElement } from 'react';

import type { HeadTag } from '@donotdev/core';

/** HTML attribute names React spells differently (`hreflang` → `hrefLang`). */
const REACT_PROP_NAMES: Readonly<Record<string, string>> = { hreflang: 'hrefLang' };

/**
 * A head tag of the shared builders (`@donotdev/core` headTags) as the element
 * `HeadTags` hoists (React 19 on Next, react-helmet-async on Vite). Usable as an
 * `Array.map` callback: the index keys the element.
 *
 * @param headTag - Tag name, HTML attributes, text content
 * @param index - Position in its list (React key)
 * @returns The element
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */
export function headTagElement({ tag, attributes, text }: HeadTag, index: number) {
  const props: Record<string, string> = { key: `${tag}-${index}` };
  for (const [name, value] of Object.entries(attributes)) {
    props[REACT_PROP_NAMES[name] ?? name] = value;
  }
  return createElement(tag, props, text);
}
