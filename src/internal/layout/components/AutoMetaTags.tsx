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
 * - BreadcrumbList (home, the page's ancestors `routeAncestors`, the page; named by their
 *   route titles) + WebSite JSON-LD structured data
 * - Internationalization integration
 * - Canonical URL management
 *
 * @version 0.3.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useMemo } from 'react';
import type { ComponentType } from 'react';

import {
  breadcrumbNamespaces,
  buildBreadcrumbJsonLd,
  getLanguageRouting,
  isMultilingual,
  languageUrl,
  languageUrls,
  matchRoute,
  routeHeadTags,
  routeSeo,
  siteHeadTags,
  SITE_LOGO_PATH,
  useLayout,
  useTranslation,
} from '@donotdev/core';
import { getDndevConfig } from '@donotdev/core';
import { useSeoConfig, useAppConfig, getPlatformEnvVar } from '@donotdev/core';
import type { SeoMeta } from '@donotdev/core';
// Platform-specific hooks via conditional exports
import { useRoutePath, useUrlLanguage } from '@donotdev/ui/routing/hooks';

import { shownRecordLabel } from '../../../crud/components/useRecordBreadcrumb';
import { useIsNotFoundDocument } from '../../../routing/NotFoundDocument';
import { headTagElement } from './headTagElement';
import { HeadTags } from './HeadTags';
import { prerenderedHead } from './prerenderedHead';
import { appTrailingSlash } from './trailingSlash';

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
 * Route metadata plus whether the route's page sets its identity on the server: its path
 * is in `routes.manifest.serverMetadataPaths` (Next: entity page, blog post, page module
 * exporting `generateMetadata`, written by the route generator; absent on Vite), and
 * whether the page is auth-only (PageMeta `auth`, same rule as the sitemap's
 * `isIndexableRoute`: noindex by default), and whether the page renders its own
 * BreadcrumbList (Next entity page: `routes.manifest.recordBreadcrumbPaths`).
 */
interface ResolvedRouteMetadata {
  meta: RouteMetadata;
  serverMetadata: boolean;
  authOnly: boolean;
  recordBreadcrumb: boolean;
}

/** No route manifest (no config): no route, no ancestor. */
const EMPTY_ROUTES: readonly { path: string }[] = [];

/**
 * Route metadata of the 404 document: its title only (`<title>`: the page's heading,
 * `errors.notFound.title`, + ` | <site name>`). Nothing derived from the URL: it has no
 * URL of its own.
 */
function notFoundRouteMetadata(title: string): ResolvedRouteMetadata {
  return {
    meta: { seo: { title } },
    serverMetadata: false,
    authOnly: false,
    recordBreadcrumb: false,
  };
}

/**
 * Get route metadata from the build-time config (`globalThis._DNDEV_CONFIG_`).
 * The route of the path is `matchRoute` (`@donotdev/core`, shared with crud): exact
 * path, then `:param` patterns (e.g. /cars/:id), then catch-alls by prefix (e.g.
 * /docs/*), so PageMeta (including namespace) is used for SEO. The config is set at
 * module load on the server (Next SSR) and in the
 * browser, so the server render and the hydration pass resolve the same metadata.
 */
function getRouteMetadata(pathname: string): ResolvedRouteMetadata {
  const config = getDndevConfig();
  const routeData = config?.routes?.mapping;
  const serverMetadataPaths = config?.routes?.manifest?.serverMetadataPaths ?? [];
  const recordBreadcrumbPaths = config?.routes?.manifest?.recordBreadcrumbPaths ?? [];
  const resolved = (route: {
    path: string;
    meta: RouteMetadata;
    auth?: unknown;
  }) => ({
    meta: route.meta,
    serverMetadata: serverMetadataPaths.includes(route.path),
    authOnly: !!route.auth,
    recordBreadcrumb: recordBreadcrumbPaths.includes(route.path),
  });
  if (routeData && Array.isArray(routeData)) {
    const match = matchRoute(routeData, pathname);
    if (match) return resolved(match.route);
  }

  // Fallback: first path segment as namespace (e.g. /cars/abc123 → ns: cars)
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    return {
      meta: { namespace: segments[0] },
      serverMetadata: false,
      authOnly: false,
      recordBreadcrumb: false,
    };
  }

  return { meta: {}, serverMetadata: false, authOnly: false, recordBreadcrumb: false };
}

/**
 * Build WebSite JSON-LD (site name and URL, used by Google for the site name).
 * No `SearchAction`: Google retired the sitelinks search box (2024-11-21).
 */
function buildWebSiteSchema(baseUrl: string, siteName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: baseUrl || '/',
  };
}

/**
 * Build Organization JSON-LD from app metadata (links, description), logo
 * `SITE_LOGO_PATH` (`/logo.svg`, as the WebPage publisher logo)
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
      url: `${baseUrl}${SITE_LOGO_PATH}`,
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
 * - Inside a NotFoundDocument (the 404, served for any unknown URL): site-level tags
 *   only, titled with the site name; nothing derived from the URL
 * - Vite prerendered page (static HTML the build wrote: static route, blog post, entity
 *   record): the identity tags the build embedded, exactly the prerendered ones; elsewhere
 *   `routeSeo` / `routeHeadTags` (@donotdev/core), the derivation the build uses
 * - Page showing a record it names with `useRecordBreadcrumb` (Next private entity page,
 *   crud display/form pages), outside server metadata and prerendered pages: titled
 *   `<record name> | <site name>` once the record is shown (browser)
 */
export const AutoMetaTags: ComponentType = () => {
  const pathname = useRoutePath();
  // The BreadcrumbList names the page's ancestors by their titles: their namespaces load
  // with the page's (Next inlines every namespace: server render = browser render)
  const routes = getDndevConfig()?.routes?.mapping ?? EMPTY_ROUTES;
  const crumbNamespaces = useMemo(
    () => breadcrumbNamespaces(pathname, routes),
    [pathname, routes]
  );
  const { t } = useTranslation(['dndev', ...crumbNamespaces]);
  const seoConfig = useSeoConfig();
  const appMeta = useAppConfig('app');
  const siteName = (seoConfig && seoConfig.siteName) || appMeta?.name || '';
  const baseUrl = getPlatformEnvVar('APP_URL') || '';
  // /rss.xml exists only when the app has blog posts (generated at build)
  const hasBlogFeed = getDndevConfig()?.routes?.manifest?.hasBlogFeed === true;

  // The 404 document is served for any unknown URL (Next: rendered once at build, at
  // `/_not-found`): nothing derived from the URL (route metadata, canonical, og:url,
  // hreflang, JSON-LD), or the server HTML and the browser render differ (React #418).
  const notFoundDocument = useIsNotFoundDocument();

  // Get route metadata — computed from current pathname
  const {
    meta: routeMeta,
    serverMetadata,
    authOnly,
    recordBreadcrumb,
  } = notFoundDocument
    ? notFoundRouteMetadata(t('errors.notFound.title'))
    : getRouteMetadata(pathname);
  // Next routes whose page sets its identity on the server (generated entity metadata,
  // blog posts, a page module's own generateMetadata) get it from there: React 19 does not
  // dedupe <title>/<meta>, so this component then emits site-level tags only. Every other
  // route (static or dynamic, Vite always) gets its identity here: PageMeta + i18n, or on
  // a Vite prerendered page the tags the build wrote (prerendered below).
  const pageOwnsIdentity = serverMetadata;

  // One URL per language (default language at the root): canonical, og:url, JSON-LD
  // and hreflang use the page's URL in each language, in the app's trailing-slash form.
  const routing = getLanguageRouting();
  const language = useUrlLanguage();
  const trailingSlash = appTrailingSlash();
  const pageUrl = (path: string) =>
    languageUrl(path, language, baseUrl, routing, trailingSlash);

  // Vite: the static HTML the build wrote for this URL (static page, blog post, entity
  // record) embeds the identity tags it holds; rendered as written, so Helmet keeps the
  // prerendered nodes. Other URLs: the route's identity (PageMeta + i18n).
  const prerendered =
    notFoundDocument || serverMetadata
      ? null
      : prerenderedHead(pageUrl(pathname));

  // The record the URL shows, named by its page (`useRecordBreadcrumb`, the breadcrumb's
  // rule `shownRecordLabel`): the page's own title (`seo.title`) where its identity is set
  // here (no server metadata, not prerendered), so its <title> reads
  // `<record name> | <site name>`. Browser only: the page publishes the label in an effect.
  const recordLabel = useLayout('routeRecordLabel');
  const recordTitle = notFoundDocument ? undefined : shownRecordLabel(pathname, recordLabel);

  // Memoize computed values for performance — must be called before any early return.
  // routeSeo (@donotdev/core): the same derivation the Vite build prerenders with.
  const metaData = useMemo(() => {
    if (!seoConfig) return null;

    // defaultImage: AppConfigProvider default (DEFAULT_OG_IMAGE, /og-image.png)
    const { defaultNamespace = 'home', defaultImage } = seoConfig;
    return routeSeo({
      meta: recordTitle
        ? { ...routeMeta, seo: { ...routeMeta.seo, title: recordTitle } }
        : routeMeta,
      // The page's own namespace; a page without one reads the site defaults
      // (appConfig.seo.defaultNamespace), never their title. None on the 404 document:
      // its title is its seo.title (the 404 heading) + the site name
      ns: notFoundDocument ? null : routeMeta.namespace || null,
      defaultNs: notFoundDocument ? null : defaultNamespace,
      t,
      siteName,
      baseUrl,
      // Canonical: this page in this language (`/en/x`; `/x` for the default language).
      // None on the 404 document (no URL of its own)
      url: notFoundDocument
        ? null
        : languageUrl(pathname, language, baseUrl, routing, trailingSlash),
      defaultImage,
      authOnly,
    });
  }, [
    notFoundDocument,
    pathname,
    language,
    trailingSlash,
    routeMeta,
    recordTitle,
    authOnly,
    siteName,
    baseUrl,
    seoConfig,
    t,
  ]);

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
  const shouldEmitHreflang =
    hreflangEnabled && !notFoundDocument && isMultilingual(routing.languages);

  // Page identity: the page's server metadata owns it on Next serverMetadataPaths routes,
  // the prerendered tags on a Vite prerendered page, else the route's (PageMeta + i18n).
  const identityTags = prerendered
    ? prerendered.tags
    : pageOwnsIdentity
      ? []
      : routeHeadTags(metaData, { siteName, baseUrl });
  // Canonical, og:url (with an app URL), og:site_name, hreflang: the build writes the same
  const siteTags = siteHeadTags({
    url: baseUrl ? metaData.url : null,
    siteName,
    alternates: shouldEmitHreflang
      ? languageUrls(pathname, baseUrl, routing, trailingSlash)
      : null,
    defaultLanguage: routing.defaultLanguage,
  });
  // Entity record pages carry their own BreadcrumbList (record title last): Next's
  // generated page, the Vite prerendered record page
  const pageOwnsBreadcrumb = recordBreadcrumb || prerendered?.breadcrumb === true;

  return (
    <HeadTags>
      {/* SITE: canonical, og:url, og:site_name, hreflang (every route) */}
      {siteTags.map(headTagElement)}

      {/* PAGE IDENTITY: title, description, Open Graph, Twitter, WebPage / record JSON-LD */}
      {identityTags.map(headTagElement)}
      {twitterHandle && (
        <meta name="twitter:site" content={`@${twitterHandle}`} />
      )}

      {/* MOBILE: Mobile-specific meta tags */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* STATIC: Additional static tags */}
      {Object.entries(staticTags).map(([name, content]) => (
        <meta key={name} name={name} content={content} />
      ))}

      {/* RSS: Auto-discovery for feed readers */}
      {baseUrl && hasBlogFeed && (
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${siteName} Blog`}
          href={`${baseUrl}/rss.xml`}
        />
      )}

      {/* JSON-LD: BreadcrumbList (home, the page's ancestors and the page, by route
          title; entity record pages own theirs) */}
      {breadcrumbSchemaEnabled &&
        !notFoundDocument &&
        !pageOwnsBreadcrumb &&
        pathname !== '/' && (
          <script type="application/ld+json">
            {JSON.stringify(
              buildBreadcrumbJsonLd({
                pathname,
                routes,
                siteName,
                t,
                defaultNs: seoConfig.defaultNamespace ?? 'home',
                pageUrl,
              })
            )}
          </script>
        )}

      {/* JSON-LD: WebSite (site name and URL) */}
      {websiteSchemaEnabled && baseUrl && (
        <script type="application/ld+json">
          {JSON.stringify(buildWebSiteSchema(baseUrl, siteName))}
        </script>
      )}

      {/* JSON-LD: Organization (homepage only, when links are configured) */}
      {organizationSchemaEnabled &&
        baseUrl &&
        pathname === '/' &&
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
