'use client';
// packages/ui/src/internal/layout/components/NextJsAutoMetaTags.tsx

/**
 * @fileoverview Next.js automatic meta tags component
 * @description Next.js-specific SEO meta tag management with route-based generation
 *
 * @deprecated This component is deprecated. Metadata is now generated server-side
 * via generateMetadata() functions in page files for optimal SEO. This component
 * only works client-side and meta tags won't be in initial HTML for search engines.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import type { ComponentType } from 'react';
import { Helmet } from 'react-helmet-async';

import { useTranslation, getDndevConfig, useIsClient } from '@donotdev/core';
import { useAppConfig, getPlatformEnvVar } from '@donotdev/core';
import type { SeoMeta } from '@donotdev/core';

interface MetaTagsConfig {
  /** Base URL for canonical links */
  baseUrl?: string;
  /** Site name for Open Graph */
  siteName?: string;
  /** Default namespace for translations */
  defaultNamespace?: string;
  /** Default image for social sharing */
  defaultImage?: string;
  /** Twitter handle (without @) */
  twitterHandle?: string;
  /** Default author for all pages */
  defaultAuthor?: string;
  /** Additional static meta tags */
  staticTags?: Record<string, string>;
}

interface RouteMetadata {
  ns?: string;
  title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
  type?: 'website' | 'article' | 'product';
  keywords?: string[];
  author?: string;
  publishDate?: string;
  modifiedDate?: string;
  seo?: SeoMeta;
}

interface NextJsAutoMetaTagsProps {
  /** Configuration for meta tags */
  config?: MetaTagsConfig;
  /** Route metadata override */
  routeMeta?: RouteMetadata;
  /** Override title */
  title?: string;
  /** Override description */
  description?: string;
  /** Override image */
  image?: string;
  /** Additional meta tags */
  additionalTags?: Record<string, string>;
}

/**
 * Match pathname against route path pattern (e.g. /cars/:id or /blog/:slug/comments/:id).
 * Supports arbitrary nesting: any depth, any mix of static and :param segments.
 */
function matchRoutePath(pattern: string, pathname: string): boolean {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathnameSegments = pathname.split('/').filter(Boolean);
  if (patternSegments.length !== pathnameSegments.length) return false;
  for (let i = 0; i < patternSegments.length; i++) {
    const segment = patternSegments[i];
    const pathSegment = pathnameSegments[i];
    if (segment === undefined || pathSegment === undefined) return false;
    if (segment.startsWith(':')) continue; // param matches any value
    if (segment !== pathSegment) return false;
  }
  return true;
}

/**
 * Resolve SEO field with i18n fallback
 * @description
 * - `undefined` → i18n lookup
 * - `string` → use literal value
 * - `null` → omit (return undefined)
 */
function resolveSeoField(
  seoValue: string | null | undefined,
  translationKey: string,
  t: (key: string) => string
): string | undefined {
  if (seoValue === null) return undefined; // Explicit null = omit
  if (seoValue !== undefined) return seoValue; // Explicit string = use it
  // undefined = i18n lookup
  const translated = t(translationKey);
  return translated !== translationKey ? translated : undefined;
}

/**
 * Get route metadata from config (injected by build system).
 * Resolves dynamic routes by pattern so PageMeta (including namespace) is used for SEO.
 */
function getRouteMetadata(pathname: string, isClient: boolean): RouteMetadata {
  if (!isClient) return {};

  // Try to get route metadata from build-time injection
  const config = getDndevConfig();
  const routeData = config?.routes?.mapping;
  if (routeData && Array.isArray(routeData)) {
    // 1. Exact match (static routes)
    let route = routeData.find((r) => r.path === pathname);
    if (route && route.meta) {
      return { ...route.meta, ns: route.meta.namespace };
    }

    // 2. Pattern match (dynamic routes: /cars/:id, /blog/:slug/comments/:id, etc.)
    const dynamicRoutes = routeData.filter(
      (r) => typeof r.path === 'string' && r.path.includes(':')
    );
    const matches = dynamicRoutes.filter((r) =>
      matchRoutePath(r.path as string, pathname)
    );
    if (matches.length > 0) {
      const best = matches.reduce((a, b) =>
        (b.path as string).length > (a.path as string).length ? b : a
      );
      if (best.meta) {
        return { ...best.meta, ns: best.meta.namespace };
      }
    }
  }

  // Fallback: first path segment as namespace
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    return { ns: segments[0] };
  }

  return {};
}

/**
 * Next.js-specific AutoMetaTags component
 *
 * Uses Next.js hooks directly instead of platform-aware hooks
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const NextJsAutoMetaTags: ComponentType<NextJsAutoMetaTagsProps> = ({
  config = {},
  routeMeta: routeMetaOverride,
  title: titleOverride,
  description: descriptionOverride,
  image: imageOverride,
  additionalTags = {},
}) => {
  // Use Next.js pathname directly
  const pathname = usePathname();
  const isClient = useIsClient();

  // Memoize the namespaces to prevent hooks order issues
  const namespaces = useMemo(() => {
    return ['dndev', config.defaultNamespace || 'home'];
  }, [config.defaultNamespace]);

  const { t } = useTranslation(namespaces);

  const {
    defaultNamespace = 'home',
    defaultImage = '/og-image.png',
    twitterHandle,
    defaultAuthor,
    staticTags = {},
  } = config;

  const siteName = config.siteName || useAppConfig('name');
  const baseUrl = getPlatformEnvVar('APP_URL') || '';

  // Get route metadata
  const routeMeta = getRouteMetadata(pathname || '/', isClient);
  const finalRouteMeta = { ...routeMeta, ...routeMetaOverride };

  // Memoize computed values for performance
  const metaData = useMemo(() => {
    // Construct absolute URL for canonical link
    const currentUrl = `${baseUrl}${pathname || '/'}`;
    const ns = finalRouteMeta.ns || defaultNamespace;
    const seo = finalRouteMeta.seo;

    // Get the meta object from i18n (for image, type, keywords, author, fullTitle)
    const metaObject = t(`${ns}:meta`, { returnObjects: true }) as
      | {
          fullTitle?: string;
          image?: string;
          type?: string;
          keywords?: string[] | string;
          author?: string;
        }
      | undefined;

    // Title resolution priority:
    // 1. i18n meta.fullTitle → translated, language-aware (wins)
    // 2. seo.fullTitle (static PageMeta) → fallback for non-i18n apps
    // 3. seo.title (explicit) → "title | siteName"
    // 4. i18n ns:title → "translated | siteName"
    // 5. siteName only (when seo.title === null or no translation)
    let fullTitle: string;
    if (metaObject?.fullTitle) {
      // i18n fullTitle (ns:meta.fullTitle) → translated, takes priority
      fullTitle = metaObject.fullTitle;
    } else if (seo?.fullTitle) {
      // Static fullTitle in PageMeta → fallback for non-i18n apps
      fullTitle = seo.fullTitle;
    } else {
      // Standard resolution: title | siteName
      const pageTitle = resolveSeoField(seo?.title, `${ns}:title`, t);
      fullTitle = pageTitle ? `${pageTitle} | ${siteName}` : siteName;
    }

    // Description resolution: seo.description > i18n
    const description = resolveSeoField(
      seo?.description,
      `${ns}:description`,
      t
    );

    // Other meta fields: seo > i18n meta object > defaults
    const pageImage = seo?.image || metaObject?.image || defaultImage;
    const pageType = seo?.type || metaObject?.type || 'website';
    const pageKeywords = seo?.keywords || metaObject?.keywords;
    const pageAuthor = finalRouteMeta.author || metaObject?.author;

    const image = pageImage || undefined;
    const type = pageType || 'website';
    const keywords = pageKeywords || undefined;
    const author = pageAuthor || undefined;

    // Use relative image path instead of constructing absolute URL
    // This prevents crashes from invalid baseUrl and works in all modes
    const imagePath =
      image && image.startsWith('http') ? image : image ? image : undefined;

    return {
      title: fullTitle,
      description,
      image: imagePath,
      url: currentUrl,
      type,
      noindex: seo?.noindex || finalRouteMeta.noindex || false,
      keywords,
      author,
      publishDate: finalRouteMeta.publishDate,
      modifiedDate: finalRouteMeta.modifiedDate,
    };
  }, [
    baseUrl,
    pathname,
    finalRouteMeta,
    defaultNamespace,
    defaultImage,
    siteName,
    t,
  ]);

  return (
    <Helmet>
      {/* ✅ CORE: Basic SEO tags */}
      <title>{metaData.title}</title>
      {metaData.description && (
        <meta name="description" content={metaData.description} />
      )}
      <link rel="canonical" href={metaData.url} />

      {/* ✅ SEO: Additional meta tags */}
      {metaData.keywords && (
        <meta
          name="keywords"
          content={
            Array.isArray(metaData.keywords)
              ? metaData.keywords.join(', ')
              : metaData.keywords
          }
        />
      )}
      {metaData.author && <meta name="author" content={metaData.author} />}
      {metaData.noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* ✅ OPEN GRAPH: Facebook, LinkedIn, etc. */}
      <meta property="og:title" content={metaData.title} />
      {metaData.description && (
        <meta property="og:description" content={metaData.description} />
      )}
      <meta property="og:url" content={metaData.url} />
      <meta property="og:type" content={metaData.type} />
      {metaData.image && <meta property="og:image" content={metaData.image} />}
      <meta property="og:site_name" content={siteName} />

      {/* ✅ ARTICLES: Additional Open Graph for blog posts */}
      {metaData.type === 'article' && (
        <>
          {metaData.author && (
            <meta property="article:author" content={metaData.author} />
          )}
          {metaData.publishDate && (
            <meta
              property="article:published_time"
              content={metaData.publishDate}
            />
          )}
          {metaData.modifiedDate && (
            <meta
              property="article:modified_time"
              content={metaData.modifiedDate}
            />
          )}
        </>
      )}

      {/* ✅ TWITTER CARDS: Enhanced social sharing */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metaData.title} />
      {metaData.description && (
        <meta name="twitter:description" content={metaData.description} />
      )}
      {metaData.image && <meta name="twitter:image" content={metaData.image} />}
      {twitterHandle && (
        <meta name="twitter:site" content={`@${twitterHandle}`} />
      )}
      {metaData.author && (
        <meta name="twitter:creator" content={metaData.author} />
      )}

      {/* ✅ MOBILE: Mobile-specific meta tags */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* ✅ STATIC: Additional static tags */}
      {Object.entries(staticTags).map(([name, content]) => (
        <meta key={name} name={name} content={content} />
      ))}

      {/* ✅ DYNAMIC: Additional override tags */}
      {Object.entries(additionalTags).map(([name, content]) => (
        <meta key={name} name={name} content={content} />
      ))}

      {/* ✅ PERFORMANCE: DNS prefetch for external images */}
      {metaData.image && metaData.image.startsWith('http') && (
        <link rel="dns-prefetch" href={new URL(metaData.image).origin} />
      )}
    </Helmet>
  );
};

export default NextJsAutoMetaTags;
