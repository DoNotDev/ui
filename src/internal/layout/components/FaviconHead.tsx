'use client';
// packages/ui/src/internal/layout/components/FaviconHead.tsx

/**
 * @fileoverview Favicon tags of a Next app
 * @description Renders the favicon set (`resolveFaviconFiles` over the build-time asset
 * manifest, `AssetResolver.resolveFaviconSet`) as the tags of `faviconHeadTags`
 * (`@donotdev/core` headTags), computed during render: the server HTML holds them, and
 * the browser renders the same tags (same manifest), so the page hydrates. React 19
 * hoists them into `<head>` ({@link HeadTags}). Next only: on Vite the build writes the
 * same tags into `index.html` and every prerendered page (`createViteFaviconPlugin`).
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { ComponentType } from 'react';

import { faviconHeadTags, useFaviconConfig } from '@donotdev/core';

import { AssetResolver } from '../../../utils/assetResolver';
import { headTagElement } from './headTagElement';
import { HeadTags } from './HeadTags';

/**
 * Favicon tags (icons, apple-touch-icon, theme-color, color-scheme) from
 * `useFaviconConfig()` (`appConfig.favicon`; `false` renders nothing) and the asset
 * manifest. No props, no effect: the server render and the hydration pass emit the same
 * tags.
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const FaviconHead: ComponentType = () => {
  const faviconConfig = useFaviconConfig();
  if (!faviconConfig) return null;

  const tags = faviconHeadTags(AssetResolver.resolveFaviconSet(), faviconConfig);
  return <HeadTags>{tags.map(headTagElement)}</HeadTags>;
};

export default FaviconHead;
