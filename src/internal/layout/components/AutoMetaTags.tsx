'use client';
// packages/ui/src/internal/layout/components/AutoMetaTags.tsx

/**
 * @fileoverview Automatic meta tags system integrated with DnDev framework
 * @description Zero-config SEO/GEO with route-based meta generation.
 * All features ON by default, opt-out per feature via appConfig.seo.{feature}: false.
 *
 * Features:
 * - Zero-configuration SEO setup
 * - Open Graph and Twitter Card support with image dimensions
 * - hreflang alternate links (auto from i18n config)
 * - Speculation Rules API (prefetch/prerender for Chromium) - opt-in, requires CSP config
 * - BreadcrumbList + WebSite JSON-LD structured data
 * - Internationalization integration
 * - Canonical URL management
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useMemo } from 'react';
import { HeadTags } from './HeadTags';

import { useTranslation, useIsClient } from '@donotdev/core';
import { getDndevConfig } from '@donotdev/core';
import { useSeoConfig, useAppConfig, getPlatformEnvVar } from '@donotdev/core';
import { AssetResolver } from '@donotdev/ui';
// Platform-specific hooks via conditional exports
import { useLocation } from '@donotdev/ui/routing/hooks';

import type { ComponentType } from 'react';
import type { SeoMeta } from '@donotdev/core';

interface RouteMetadata {
  namespace?: string;
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
 * Get route metadata from window object (injected by build system).
 * Resolves dynamic routes by pattern (e.g. /cars/:id) so PageMeta (including namespace) is used for SEO.
 */
function getRouteMetadata(pathname: string, isClient: boolean): RouteMetadata {
  if (!isClient) return {};

  // Try to get route metadata from build-time injection
  const config = getDndevConfig();
  const routeData = config?.routes?.mapping;
  if (routeData && Array.isArray(routeData)) {
    // 1. Exact match (static routes)
    let route = routeData.find((r) => r.path === pathname);
    if (route) return route.meta;

    // 2. Pattern match (dynamic routes: /cars/:id, /blog/:slug/comments/:id, etc.)
    const dynamicRoutes = routeData.filter(
      (r) => typeof r.path === 'string' && r.path.includes(':')
    );
    const matches = dynamicRoutes.filter((r) =>
      matchRoutePath(r.path as string, pathname)
    );
    // Prefer most specific (longest path) so /blog/:slug/comments wins over /blog/:slug for /blog/a/comments
    if (matches.length > 0) {
      route = matches.reduce((best, r) =>
        (r.path as string).length > (best.path as string).length ? r : best
      );
      return route.meta;
    }
  }

  // Fallback: first path segment as namespace (e.g. /cars/abc123 → ns: cars)
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    return { namespace: segments[0] };
  }

  return {};
}

/**
 * Build BreadcrumbList JSON-LD from URL path segments
 */
function buildBreadcrumbSchema(
  pathname: string,
  baseUrl: string,
  siteName: string
) {
  const segments = pathname.split('/').filter(Boolean);
  const items = [
    {
      '@type': 'ListItem' as const,
      position: 1,
      name: siteName,
      item: baseUrl || '/',
    },
  ];

  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    currentPath += `/${segments[i]}`;
    items.push({
      '@type': 'ListItem' as const,
      position: i + 2,
      name: segments[i]!.split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      item: `${baseUrl}${currentPath}`,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

/**
 * Build WebSite JSON-LD with SearchAction (sitelinks search box)
 */
function buildWebSiteSchema(baseUrl: string, siteName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: baseUrl || '/',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Build Organization JSON-LD from app metadata (links, description)
 * Only emitted on homepage when links are configured
 */
function buildOrganizationSchema(
  baseUrl: string,
  siteName: string,
  description?: string,
  links?: Record<string, string | undefined>
) {
  const sameAs = links
    ? Object.values(links).filter((url): url is string => !!url)
    : [];

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: baseUrl || '/',
    ...(description && { description }),
    ...(sameAs.length > 0 && { sameAs }),
    logo: {
      '@type': 'ImageObject',
      url: `${baseUrl}/icon-512x512.png`,
    },
  };
}

/**
 * Build speculation rules for prefetch/prerender of public internal links
 * Excludes auth-gated and API routes
 */
function buildSpeculationRules() {
  return {
    prerender: [
      {
        where: {
          and: [
            { href_matches: '/*' },
            { not: { href_matches: '/api/*' } },
            { not: { href_matches: '/admin/*' } },
            { not: { href_matches: '/login*' } },
            { not: { href_matches: '/signin*' } },
            { not: { href_matches: '/signup*' } },
            { not: { href_matches: '/logout*' } },
          ],
        },
        eagerness: 'moderate',
      },
    ],
    prefetch: [
      {
        where: {
          and: [{ href_matches: '/*' }, { not: { href_matches: '/api/*' } }],
        },
        eagerness: 'conservative',
      },
    ],
  };
}

/**
 * AutoMetaTags component
 *
 * Uses configuration from AppConfigProvider context.
 * No props needed - all config comes from useSeoConfig() and useAppConfig().
 *
 * Features:
 * - Automatic route-based meta tag generation
 * - i18n integration with hreflang
 * - Open Graph and Twitter Cards with image dimensions
 * - Speculation Rules API
 * - BreadcrumbList + WebSite JSON-LD
 * - 100% Lighthouse SEO compliance
 */
export const AutoMetaTags: ComponentType = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const seoConfig = useSeoConfig();
  const isClient = useIsClient();
  const appMeta = useAppConfig('app');
  const siteName = (seoConfig && seoConfig.siteName) || appMeta?.name || '';
  const baseUrl = getPlatformEnvVar('APP_URL') || '';

  // Get route metadata — computed from current pathname and client flag
  const routeMeta = getRouteMetadata(location.pathname, isClient);

  // Read i18n languages from build-time config (for hreflang)
  const i18nConfig = useMemo(() => {
    const config = getDndevConfig();
    return config?.i18n as
      | { languages?: string[]; defaultLanguage?: string }
      | undefined;
  }, []);

  // Memoize computed values for performance — must be called before any early return
  const metaData = useMemo(() => {
    if (!seoConfig) return null;

    const { defaultNamespace = 'home', defaultImage } = seoConfig;
    // Construct absolute URL for canonical link
    const currentUrl = `${baseUrl}${location.pathname}`;
    const ns = routeMeta.namespace || defaultNamespace;
    const seo = routeMeta.seo;

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
    const pageAuthor = routeMeta.author || metaObject?.author;

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
      noindex: seo?.noindex || routeMeta.noindex || false,
      keywords,
      author,
      publishDate: routeMeta.publishDate,
      modifiedDate: routeMeta.modifiedDate,
    };
  }, [location.pathname, routeMeta, siteName, baseUrl, seoConfig, t]);

  // Return null if SEO is disabled — after all hooks have been called
  if (!seoConfig || !metaData) return null;

  const { twitterHandle, staticTags = {} } = seoConfig;

  // Feature flags — all default to true (ON by default), except speculationRules (CSP conflict)
  // Speculation rules require inline script which conflicts with strict CSP.
  // Opt-in only: set seo.speculationRules: true and add CSP hash to your headers.
  const speculationRulesEnabled = seoConfig.speculationRules === true;
  const hreflangEnabled = seoConfig.hreflang !== false;
  const breadcrumbSchemaEnabled = seoConfig.breadcrumbSchema !== false;
  const websiteSchemaEnabled = seoConfig.websiteSchema !== false;
  const organizationSchemaEnabled = seoConfig.organizationSchema !== false;

  // hreflang: only emit when 2+ languages configured
  const languages = i18nConfig?.languages || [];
  const defaultLanguage = i18nConfig?.defaultLanguage || 'en';
  const shouldEmitHreflang = hreflangEnabled && languages.length >= 2;

  return (
    <HeadTags>
      {/* CORE: Basic SEO tags */}
      <title>{metaData.title}</title>
      {metaData.description && (
        <meta name="description" content={metaData.description} />
      )}
      {baseUrl && <link rel="canonical" href={metaData.url} />}

      {/* SEO: Additional meta tags */}
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

      {/* OPEN GRAPH: Facebook, LinkedIn, etc. */}
      <meta property="og:title" content={metaData.title} />
      {metaData.description && (
        <meta property="og:description" content={metaData.description} />
      )}
      {baseUrl && <meta property="og:url" content={metaData.url} />}
      <meta property="og:type" content={metaData.type} />
      {metaData.image && <meta property="og:image" content={metaData.image} />}
      {metaData.image && <meta property="og:image:width" content="1200" />}
      {metaData.image && <meta property="og:image:height" content="630" />}
      <meta property="og:site_name" content={siteName} />

      {/* ARTICLES: Additional Open Graph for blog posts */}
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

      {/* TWITTER CARDS: Enhanced social sharing */}
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

      {/* MOBILE: Mobile-specific meta tags */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* STATIC: Additional static tags */}
      {Object.entries(staticTags).map(([name, content]) => (
        <meta key={name} name={name} content={content} />
      ))}

      {/* HREFLANG: Alternate language links (only when 2+ languages) */}
      {shouldEmitHreflang &&
        languages.map((lang) => (
          <link
            key={`hreflang-${lang}`}
            rel="alternate"
            hrefLang={lang}
            href={`${baseUrl}${lang === defaultLanguage ? '' : `/${lang}`}${location.pathname}`}
          />
        ))}
      {shouldEmitHreflang && (
        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${baseUrl}${location.pathname}`}
        />
      )}

      {/* RSS: Auto-discovery for feed readers */}
      {baseUrl && (
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${siteName} Blog`}
          href={`${baseUrl}/rss.xml`}
        />
      )}

      {/* PERFORMANCE: DNS prefetch for external images */}
      {metaData.image && metaData.image.startsWith('http') && (
        <link rel="dns-prefetch" href={new URL(metaData.image).origin} />
      )}

      {/* JSON-LD: Page/Article structured data */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': metaData.type === 'article' ? 'Article' : 'WebPage',
          name: metaData.title,
          ...(metaData.description && { description: metaData.description }),
          url: metaData.url,
          ...(metaData.image && { image: metaData.image }),
          ...(metaData.type === 'article' && {
            ...(metaData.author && {
              author: {
                '@type': 'Person',
                name: metaData.author,
              },
            }),
            ...(metaData.publishDate && {
              datePublished: metaData.publishDate,
            }),
            ...(metaData.modifiedDate && {
              dateModified: metaData.modifiedDate,
            }),
          }),
          publisher: {
            '@type': 'Organization',
            name: siteName,
            logo: {
              '@type': 'ImageObject',
              url: AssetResolver.assetExists('/icon-512x512.png')
                ? '/icon-512x512.png'
                : AssetResolver.assetExists('/icon-192x192.png')
                  ? '/icon-192x192.png'
                  : '/logo.svg',
            },
          },
        })}
      </script>

      {/* JSON-LD: BreadcrumbList (auto from URL segments) */}
      {breadcrumbSchemaEnabled && location.pathname !== '/' && (
        <script type="application/ld+json">
          {JSON.stringify(
            buildBreadcrumbSchema(location.pathname, baseUrl, siteName)
          )}
        </script>
      )}

      {/* JSON-LD: WebSite with SearchAction (sitelinks search box) */}
      {websiteSchemaEnabled && baseUrl && (
        <script type="application/ld+json">
          {JSON.stringify(buildWebSiteSchema(baseUrl, siteName))}
        </script>
      )}

      {/* JSON-LD: Organization (homepage only, when links are configured) */}
      {organizationSchemaEnabled &&
        baseUrl &&
        location.pathname === '/' &&
        appMeta?.links &&
        Object.values(appMeta.links).some(Boolean) && (
          <script type="application/ld+json">
            {JSON.stringify(
              buildOrganizationSchema(
                baseUrl,
                siteName,
                appMeta.description,
                appMeta.links
              )
            )}
          </script>
        )}

      {/* SPECULATION RULES: Prefetch/prerender for Chromium browsers (progressive enhancement) */}
      {speculationRulesEnabled && (
        <script type="speculationrules">
          {JSON.stringify(buildSpeculationRules())}
        </script>
      )}
    </HeadTags>
  );
};

/**
 * AutoMetaTags retrieves all configuration from AppConfigProvider.
 * Page-specific overrides should be configured through AppConfig or route metadata.
 */

export default AutoMetaTags;
