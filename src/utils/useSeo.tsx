'use client';
// packages/ui/src/utils/useSeo.tsx

/**
 * @fileoverview Dynamic SEO Component
 * @description Isomorphic component for setting SEO metadata at runtime.
 * Works with both static pages and dynamic data (after fetch).
 * Uses react-helmet-async internally - works in SSR/prerender.
 *
 * Priority (highest to lowest):
 * 1. <Seo /> component - runtime, always wins
 * 2. i18n meta.fullTitle - translated
 * 3. seo.fullTitle (PageMeta) - static fallback
 * 4. seo.title / i18n title - "title | siteName"
 * 5. siteName only
 *
 * @example Basic usage
 * ```tsx
 * const { data: apartment } = useApartment(id);
 *
 * return (
 *   <>
 *     {apartment && (
 *       <Seo
 *         fullTitle={`${apartment.reference} - €${apartment.rent} | 아이수수`}
 *         description={apartment.description}
 *         image={apartment.photos[0]}
 *       />
 *     )}
 *     <ApartmentDetails data={apartment} />
 *   </>
 * );
 * ```
 *
 * @version 0.1.0
 * @since 0.2.0
 * @author AMBROISE PARK Consulting
 */

import type { ReactElement } from 'react';

import { Helmet } from 'react-helmet-async';

import { useAppConfig } from '@donotdev/core';

import type { SeoMeta } from '@donotdev/core';

/**
 * Dynamic SEO props
 * Extends SeoMeta with runtime-specific fields
 */
export interface SeoProps extends SeoMeta {
  /**
   * Canonical URL override
   * @description If not set, uses current URL
   */
  canonicalUrl?: string;

  /**
   * Article publish date (ISO 8601)
   * @description For article pages, sets article:published_time
   */
  publishDate?: string;

  /**
   * Article modified date (ISO 8601)
   * @description For article pages, sets article:modified_time
   */
  modifiedDate?: string;
}

/**
 * Dynamic SEO component
 *
 * @description Sets SEO metadata at runtime. Render after data is loaded.
 * Overrides any static PageMeta SEO settings.
 * Works in SSR/prerender - meta tags will be in initial HTML.
 *
 * @example Static title override
 * ```tsx
 * <Seo fullTitle="About Us | MyApp" />
 * ```
 *
 * @example Dynamic product page
 * ```tsx
 * const { data: product } = useProduct(id);
 * if (!product) return <Loading />;
 *
 * return (
 *   <>
 *     <Seo
 *       title={product.name}
 *       description={product.description}
 *       image={product.image}
 *       type="product"
 *     />
 *     <ProductDetails product={product} />
 *   </>
 * );
 * ```
 *
 * @example Article with dates
 * ```tsx
 * <Seo
 *   title={article.title}
 *   description={article.excerpt}
 *   type="article"
 *   publishDate={article.createdAt}
 *   modifiedDate={article.updatedAt}
 * />
 * ```
 */
export function Seo({
  title,
  fullTitle,
  description,
  image,
  type = 'website',
  keywords,
  noindex,
  canonicalUrl,
  publishDate,
  modifiedDate,
}: SeoProps): ReactElement | null {
  const siteName = useAppConfig('name') || '';

  // Resolve final title
  const resolvedTitle = fullTitle
    ? fullTitle
    : title
      ? `${title} | ${siteName}`
      : siteName;

  // Build meta tags array for cleaner rendering
  const metaTags: ReactElement[] = [];

  // Description
  if (description) {
    metaTags.push(
      <meta key="description" name="description" content={description} />,
      <meta
        key="og:description"
        property="og:description"
        content={description}
      />,
      <meta
        key="twitter:description"
        name="twitter:description"
        content={description}
      />
    );
  }

  // Image
  if (image) {
    metaTags.push(
      <meta key="og:image" property="og:image" content={image} />,
      <meta key="twitter:image" name="twitter:image" content={image} />,
      <meta
        key="twitter:card"
        name="twitter:card"
        content="summary_large_image"
      />
    );
  }

  // Type
  if (type) {
    metaTags.push(<meta key="og:type" property="og:type" content={type} />);
  }

  // Keywords
  if (keywords && keywords.length > 0) {
    const keywordsStr = Array.isArray(keywords)
      ? keywords.join(', ')
      : keywords;
    metaTags.push(
      <meta key="keywords" name="keywords" content={keywordsStr} />
    );
  }

  // Robots
  if (noindex) {
    metaTags.push(
      <meta key="robots" name="robots" content="noindex, nofollow" />
    );
  }

  // Article-specific meta
  if (type === 'article') {
    if (publishDate) {
      metaTags.push(
        <meta
          key="article:published_time"
          property="article:published_time"
          content={publishDate}
        />
      );
    }
    if (modifiedDate) {
      metaTags.push(
        <meta
          key="article:modified_time"
          property="article:modified_time"
          content={modifiedDate}
        />
      );
    }
  }

  // OG/Twitter title
  metaTags.push(
    <meta key="og:title" property="og:title" content={resolvedTitle} />,
    <meta key="twitter:title" name="twitter:title" content={resolvedTitle} />
  );

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {metaTags}
    </Helmet>
  );
}

/**
 * Hook version for those who prefer hooks
 * Returns the Seo component with props bound
 *
 * @example
 * ```tsx
 * const SeoTags = useSeo({
 *   title: apartment.reference,
 *   description: apartment.description,
 * });
 *
 * return (
 *   <>
 *     <SeoTags />
 *     <Content />
 *   </>
 * );
 * ```
 */
export function useSeo(props: SeoProps | null): () => ReactElement | null {
  if (props === null) {
    return () => null;
  }
  return () => <Seo {...props} />;
}
