# SEO & Meta Tags

**Same `PageMeta` works on Vite and Next.js. i18n-first by default.**

---

## How It Works

**Vite:** AutoMetaTags reads route manifest + i18n - Helmet renders meta tags
**Next.js:** the same AutoMetaTags, server-rendered by the generated layout - React 19 hoists the tags into `<head>`

**Same code, both platforms. No conditional logic needed.**

---

## Why This Matters: Crawlers & Initial HTML

**Problem:** Google/social crawlers don't execute JavaScript. They read the initial HTML.

**SPA without SSR:** Meta tags injected client-side - crawlers see empty `<head>` - bad SEO.

**With framework:**

| Platform | Static Pages | Dynamic Pages |
|----------|--------------|---------------|
| **Vite** | Prerendered at build, one page per language - meta in HTML | Entity pages: one static HTML per public record at build, identity from the record (same as Next). Other dynamic pages: AutoMetaTags (the route's PageMeta + i18n, same for every URL) |
| **Next.js** | AutoMetaTags, in the server HTML | Entity pages: generated server metadata from the record (no app code). Other dynamic pages: the page module's own `generateMetadata`, else AutoMetaTags |

**Verify:** View Page Source (not DevTools). Meta tags should be visible without JS.

---

## Languages: One URL Each

With 2+ languages every page has one URL per language (default language at the root, others
under `/<lang>`, see core `I18N.md`). Automatic:

- **Canonical / `og:url` / JSON-LD `url`:** the page in its own language (`/en/x` on the English page), entity pages included (AutoMetaTags emits canonical / `og:url` on every route).
- **`hreflang`:** one `<link rel="alternate">` per language plus `x-default` (the root URL).
- **Sitemap (Next `src/app/sitemap.xml/route.next.ts`, Vite `dist/sitemap.xml`):** every language's URL of each page, each entry with `alternates.languages`.
- **Prerendered pages (Vite):** one file per language URL (`dist/about.html`, `dist/en/about.html`), each with its hreflang alternates.

One language: unprefixed URLs, no `hreflang`.

**Trailing slash (Next):** with `trailingSlash: true` in `defineNextConfig` (passed through to Next, which then redirects `/about` to `/about/`), every public URL the framework emits ends with `/`, language homes included (`/fr/`, `/about/`): canonical, `og:url`, `hreflang`, JSON-LD (`url`, breadcrumb items, entity page Product `url`, search `urlTemplate`), sitemap and llms.txt. File URLs (`/rss.xml`, images) keep their form. The build writes the setting into the route manifest (`routes.manifest.trailingSlash`) and the generated sitemap / llms.txt routes; `formatTrailingSlash` (`@donotdev/core`) is the one place that applies it. Unset or `false`: URLs unchanged.

---

## Dynamic Pages: Per-URL SEO Required

The build fails on a public, indexable `:param` route (not `auth`, not `seo: { noindex: true }`) that has no per-URL identity: all its URLs would share one title and description. Ways out, in the error (`[dndev-routes] <file>: public dynamic route <path> has no per-URL SEO ...`):

1. Declare the record entity it shows: `entity: productEntity` (imported from `'entities'`, see Entity pages).
2. Next only: export Next's `generateMetadata` from the page module (see Other dynamic pages). Vite has no server: not a way out there.
3. `seo: { noindex: true }`.

Exempt, like the sitemap: error routes (`/404`, `/not-found`, `/500`, `/error`), catch-all routes (`/docs/*`: no URL list, never in the sitemap), blog post routes (`blog` namespace: identity from the post's frontmatter).

---

## Vite: Prerendering

**Enabled by default** in `vite.config.ts`:

```ts
export default defineViteConfig({
  prerender: true,  // Default: true
});
```

**What happens** (after the bundle, no browser):

1. `dist/_shell.html`: the SPA shell as Vite built it. The hosting rewrite serves it for every URL without a file (an unprerendered dynamic URL, a record published after the build); `dist/index.html` becomes the prerendered home page, so its tags never land on other URLs.
2. One page per public static route and blog post **and per language** (default language at the root, others under `/<lang>`): `dist/about.html`, `dist/en/about.html`, `dist/index.html`, `dist/en.html`. Its head is the identity AutoMetaTags computes for that URL (`routeSeo` / `routeHeadTags` from `@donotdev/core`, the same functions: PageMeta + i18n in the page language, absolute `og:image` / `twitter:image`) plus canonical, `og:url`, `og:site_name` and hreflang (see Languages; `seo.hreflang: false` respected).
3. One page per public record of each entity route and language (see Entity pages (Vite)).
4. `dist/sitemap.xml` and `dist/llms.txt` of the same URL set (see Sitemap & llms.txt).

**Output layout: `<path>.html`.** A page URL has no trailing slash on Vite; `/produits/serum` is `dist/produits/serum.html`. The hosting serves it at the slash-less URL with no redirect (`cleanUrls`, see Hosting).

**In the browser:** each page embeds its identity tags (`<script type="application/json" id="dndev-prerendered-head">`, data: any CSP allows it). On that URL AutoMetaTags renders exactly them, and react-helmet-async keeps the prerendered nodes (they carry its `data-rh` marker): no flip, no duplicate. After a client navigation it replaces them like its own tags.

**Dynamic routes** without an entity (e.g., `/search/:q`): AutoMetaTags gives them the route's identity (PageMeta + i18n: one title and description for every URL), on the shell.

### Entity pages (Vite): one static HTML per record

With `prerender: 'auto'` (the default), the build writes one page per public record of each entity route (Next's rule: single `:param`, indexable, page declaring `entity` in PageMeta) and per language: `dist/produits/serum.html`, `dist/en/produits/serum.html`. No app code.

- **Records:** the Next build's (`listPublicPages`: `status` not in `HIDDEN_STATUSES`, at most 1000 per route), read once at build as a signed-out visitor with the app's public reader: `@donotdev/supabase` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLIC_KEY`, RLS decides) or `@donotdev/firebase` (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, Security Rules decide). The same read fills sitemap.xml and llms.txt, so an app with entity routes reads its records at every build (also with `prerenderRecords: false`, for the sitemap). The build fails on a missing env, a failed read, another provider, no `entities` package, no site name, or (record pages) a `VITE_APP_URL` that ends with `/` (the browser builds the same URLs from it). A deploy build also fails on an unset or local `VITE_APP_URL`; a local build takes a local one and, without one, writes no record page (see Sitemap & llms.txt, URLs).
- **Head:** the Next entity page identity (`entityRecordSeo`, shared: title `<record title> | <site name>`, description, Open Graph, Twitter card, og:type from `seo.type`, Product JSON-LD for `product`, BreadcrumbList ending with the record title, text in the page language) plus the site tags and hreflang.
- **SPA shell instead** (the route's PageMeta + i18n identity): a record published after the build (until the next build), a value a static route already serves (the static page wins, as on Next), a value no file name can hold (`a/b`, `..`; listed in the build log).
- **Opt out:** `appConfig.prerenderRecords: false`. An explicit `prerender: ['/a', '/b']` list prerenders those routes only (globs `'/blog/*'` match page paths, never a `:param` template). A page module's `generateMetadata` is Next only: the Vite record page keeps the entity identity.

### Hosting: clean URLs, the shell as fallback

The scaffolded configs serve `<path>.html` at `/<path>` (200, no redirect) and fall back to the shell:

- **Firebase Hosting** (`firebase.json`): `"cleanUrls": true` and the rewrite `{ "source": "**", "destination": "/_shell.html" }`. Firebase serves an existing file before any rewrite.
- **Vercel, Git deploy** (`vercel.json`): `"cleanUrls": true` and the rewrite `{ "source": "/(.*)", "destination": "/_shell" }` (with `cleanUrls`, destinations have no extension).
- **Vercel, `dndev deploy`** (Build Output API): each `<path>.html` gets an `overrides` entry (`{ "path": "<path>" }`), the fallback route is `/_shell`.

An app whose own config lacks `cleanUrls` never serves the prerendered pages at their URLs (`/about` finds no file `about`), and one still rewriting to `/index.html` serves the home page's head (canonical included) on every other URL: update its `firebase.json` / `vercel.json` to the lines above.

**Not found (Vite):** a client-rendered app answers every URL with HTTP 200, so the not-found state carries `<meta name="robots" content="noindex">`: the framework 404 (the `*` route) and a record page while the record its URL names is not found (`useCrudDoc` reporting `notFound` for the route's declared entity and `:param` value; a secondary read on the page never does, crud `CRUD.md`). Next serves a real 404 instead (`notFound()`, not-found pages) and adds no robots tag.

---

## Next.js: Server Rendering

**Automatic.** The generated layout renders the app's providers, which render AutoMetaTags (a client component) above the page. Both are server-rendered (SSR is the default; `appConfig.ssr: false` renders them in the browser only), and React 19 hoists every `<title>`, `<meta>` and `<link>` into `<head>`.

**React 19 does not dedupe head tags** (Helmet does, on Vite): two sources of a `<title>` ship two titles. One owner per tag:

| Route | Page identity (title, description, Open Graph, Twitter, robots, JSON-LD) | Always AutoMetaTags |
|-------|------|------|
| Static (`/about`), dynamic without server metadata | AutoMetaTags (PageMeta + i18n) | canonical, `og:url`, `og:site_name`, `hreflang`, BreadcrumbList / WebSite / Organization JSON-LD |
| Entity page (`/produits/:slug`, see below) | The generated page: `generateMetadata` + JSON-LD from the record (AutoMetaTags emits none) | same, except the BreadcrumbList: the page renders it (record title last) |
| Page module exporting `generateMetadata` | That `generateMetadata` (AutoMetaTags emits none) | same |
| Blog post (`blog` namespace, dynamic route) | The generated page's `generateMetadata` (per-post title, description, Open Graph) | same |

The route generator writes the routes of the last three rows into the route manifest (`routes.manifest.serverMetadataPaths`); AutoMetaTags skips the identity exactly there. Entity pages are also in `routes.manifest.recordBreadcrumbPaths`: AutoMetaTags emits no BreadcrumbList there.

- **Route of a URL** (both platforms): exact path, then `:param` patterns (most specific), then catch-alls: a `/docs/*` route's PageMeta applies to every URL under `/docs` (longest prefix wins).
- **Site-level metadata:** `export const metadata` in `src/app/AppDocument.tsx` (`metadataBase`), re-exported by the generated root layout. No page titles there.

### Entity pages: identity from the record, no app code

A public single-param route whose page declares its entity in PageMeta (indexable, not `auth`) gets its head from the server; its records are also the sitemap's. The page renders no SEO component.

```tsx
// src/pages/products/ProductPage.tsx (the folder shapes the URL and breadcrumbs only)
import { productEntity } from 'entities';

export const meta: PageMeta = {
  namespace: 'product',
  route: '/produits/:slug',
  entity: productEntity, // the defineEntity definition: collection 'products'
  seo: { type: 'product' },
};
```

- **Declaring the entity:** `entity` is the `defineEntity` definition imported from the app's `entities` package; the build resolves it to its `collection` (`meta.entity`). A string, an identifier not imported from `'entities'`, or a value that is not a `defineEntity` with a literal `collection` fails the build, and so does any other expression: `import * as entities from 'entities'` with `entity: entities.productEntity` (the build reads the meta statically; write `import { productEntity } from 'entities'`). A dynamic page without `entity` is a plain dynamic page: its own exported `generateMetadata` (Next), else `seo: { noindex: true }` (see Dynamic Pages: Per-URL SEO Required).

- **Read:** the generated `page.tsx` reads the record named by the URL (`<param> == value`, `status` not in `HIDDEN_STATUSES`) with the public server reader of `generateStaticParams` (signed-out visitor: RLS / Security Rules decide; `@donotdev/supabase` or `@donotdev/firebase`, any other provider fails the build). React `cache`: `generateMetadata` and the page share one read per request. The page's own client data reads are separate. `appConfig.prerenderRecords: false` stops the build-time prerender only: each URL still reads its record on its first request.
- **`generateMetadata`:** title `<record title> | <site name>` (absolute: no layout title template; site name = `appConfig.seo.siteName`, else `appConfig.app.name`), description, Open Graph (title, description, absolute image, `og:type`), Twitter card. Derived by `deriveEntitySeo` with the entity's `seo` option (see Entity-derived identity), text in the URL's language (entity namespace then `crud` translations, `@donotdev/core/rsc`). Canonical, `og:url` and `hreflang` stay with AutoMetaTags.
- **`og:type`:** PageMeta `seo.type` (`website` default, `article`, `product`). `product` also renders Product JSON-LD (`<script type="application/ld+json">`, from `buildProductJsonLd`) and `<meta property="og:type" content="product">` in the page (Next's metadata API has no `product` type).
- **BreadcrumbList JSON-LD:** rendered by the page (`buildBreadcrumbJsonLd`, shared with the Vite record pages): the site name, the URL's segments named as the visible breadcrumb names them (words title-cased), the record title last: the label the visible breadcrumb shows on the segment naming the record (`useRecordBreadcrumb`: the slug on `/produits/:slug`, the id on `/products/:id`). No record title: no BreadcrumbList.
- **Missing record** (unknown value, hidden status): `notFound()`. The response is HTTP 404 with the app's 404 page and Next's `noindex`; a page component's own not-found state is never served for such a URL.
- **Own `generateMetadata` wins:** a server page module (no `'use client'`) exporting `generateMetadata` replaces the generated metadata, JSON-LD and 404 (one source, no second title); it then calls `notFound()` itself.
- **Build fails** without the app's `entities` package, without a site name, or with a provider that has no server reader. Opt a route out with `seo: { noindex: true }` (also leaves the sitemap).
- The per-request tree (`dndev-session`) re-exports the same `generateMetadata`.

### Other dynamic pages: Next's `generateMetadata`

A page module may export Next's own `generateMetadata` (standard Next API). The generated `page.tsx` re-exports it (and the per-request tree page too), and AutoMetaTags emits no identity on that route.

```tsx
// src/pages/search/SearchPage.tsx: a server module (no 'use client')
import type { Metadata } from 'next';

export const meta: PageMeta = { route: '/recherche/:q' };

export async function generateMetadata({ params }: { params: Promise<{ q: string }> }): Promise<Metadata> {
  const { q } = await params;
  return { title: { absolute: `${q} | Shop` } };
}

export default function SearchPage() {
  return <SearchResults />; // a 'use client' component
}
```

- **`'use client'` page exporting `generateMetadata`:** the build fails (Next reads it only from server modules, the page would ship without metadata). Keep the page module a server component that renders the client UI.
- **Canonical / `hreflang`:** AutoMetaTags emits them; do not set `alternates` or `openGraph.url` (a second canonical).
- **Vite:** ignored (no server).

---

## Standard Use: i18n-First

**Pattern:** Define `namespace` in PageMeta, translations provide SEO.

```tsx
// src/pages/AboutPage.tsx
export const meta: PageMeta = {
  namespace: 'about',
};
```

```json
// src/locales/about_en.json
{
  "title": "About Us",
  "description": "Learn more about our company and mission.",
  "meta": {
    "keywords": ["about", "company", "mission"],
    "image": "/og-about.png"
  }
}
```

**Result:** `<title>About Us | SiteName</title>`, meta description, OG tags - all from i18n.

---

## Override: Static SEO

**Pattern:** Use `seo` field for static overrides or non-i18n apps.

```tsx
export const meta: PageMeta = {
  namespace: 'home',
  seo: {
    fullTitle: 'DoNotDev - Build Apps Fast',  // Exact title, no "| SiteName"
    description: 'Ship production apps in minutes.',
    image: '/og-home.png',
    type: 'website',
  },
};
```

---

## Link-Preview Image

The build generates `public/og-image.png` (1200x630, logo centered) from `public/logo.svg`, next to the favicon and PWA icons. Vite and Next.js both default `og:image` to it (`appConfig.seo.defaultImage`, default `DEFAULT_OG_IMAGE`, `/og-image.png`), as an absolute URL when `APP_URL` is set. One default for every tag: AutoMetaTags, the Vite prerendered pages (static and record), the Next entity page metadata and `getMetadataForPath`.

- **Replace it:** put your own `public/og-image.png`; an existing file is never overwritten.
- **Per page:** `seo.image` in `PageMeta`, or `meta.image` in the namespace's translations.
- **Entity pages (Next, Vite record pages):** the record's first image (`deriveEntitySeo`), else the site default.
- **Site-wide:** `appConfig.seo.defaultImage` (e.g. `'/og-image.jpg'`) replaces the default everywhere (build-written and runtime tags stay identical).
- **Not generated** without `public/logo.svg` or without `sharp` installed (the build log lists it as skipped): `og:image` then points to a missing `/og-image.png`. Add the file to `public/`.

Use JPG or PNG: link-preview crawlers do not reliably render SVG.

---

## Site Logo (JSON-LD)

The JSON-LD logo is always the app's `public/logo.svg` (`SITE_LOGO_PATH`, `@donotdev/core`), as an absolute URL: the Organization `logo` (home page, when `appConfig.app.links` is set) and the WebPage / Article `publisher.logo` (every page with an app URL). One path, no existence check or asset-manifest lookup at render, so the server render, the browser and the Vite prerendered pages write the same URL (no hydration mismatch). The generated PWA icons (`icon-*x*.png`) are never used for it.

- **Missing `public/logo.svg`:** the build warns (`logo.svg not found in public/`); the JSON-LD logo then points to a missing file, and no favicon, PWA icons or `og-image.png` are generated. Add `public/logo.svg`.

---

## All SEO Options

```tsx
export const meta: PageMeta = {
  namespace: 'blog',
  seo: {
    // Title options (pick one)
    title: 'Blog',              // "Blog | SiteName"
    fullTitle: 'My Blog',       // "My Blog" (exact, no suffix)
    title: null,                // "SiteName" only

    // Description
    description: 'Latest posts',
    description: null,          // Omit description entirely

    // Social sharing
    image: '/og-blog.png',      // OG/Twitter image
    type: 'website',            // 'website' | 'article' | 'product'

    // Other
    keywords: ['blog', 'news'],
    noindex: true,              // Hide from search engines (noindex, nofollow)
    noindex: false,             // Indexable even when auth-only (default there: noindex)
  },
};
```

---

## Priority Chain

Resolution order (highest to lowest):

On Next routes with server metadata (entity pages, a page's own `generateMetadata`, blog posts) that metadata is the only identity. Everywhere else:

1. **`seo.fullTitle`** - Exact title, set on the page
2. **i18n `meta.fullTitle`** - Translated, language-aware (the page's own namespace)
3. **`seo.title`** - "Static | SiteName" (`seo.title: null`: SiteName only)
4. **i18n `title`** - "Translated | SiteName" (the page's own namespace)
5. **SiteName only** - Default fallback

What the page sets in PageMeta wins over its translations, for the full title as for the title.

**Page without a `namespace`:** it reads the site defaults, the namespace `appConfig.seo.defaultNamespace` (default `home`), for its description, image, type, keywords and author, never for its title: its title is its own `seo.fullTitle` / `seo.title`, else the site name. Another page's title (the home page's) never lands on it.

(`routeSeo` in core `headTags.ts`, written once: AutoMetaTags, the Vite prerendered pages, llms.txt page labels (`routeTitle`, the same chain), and the Next metadata manifest of `getMetadataForPath`, which the plain-Node build reads from `config/utils/headTags.js`, generated from `headTags.ts` by `bun run bpr`.)

---

## Entity-derived identity

`deriveEntitySeo` (`@donotdev/core`) builds a record's identity, the same on the Next entity page metadata, llms.txt and the CRUD breadcrumb:

- **title:** `listCardFields.title` texts, formatted exactly like the CRUD card (`formatFieldText`: select labels, numbers in the locale, `displayKey`, `displayValue`), joined with `titleSeparator`; empty fields dropped. No slot layout: first `text` field.
- **description:** first long-text field with a value (textarea/richtext, HTML stripped), else the card subtitle texts then content texts (joined ` · `). Max 160 chars.
- **JSON-LD (PageMeta `seo.type: 'product'`):** `offers` when a price/currency field is positive; `offers.availability` from the record `status`: `available` → `https://schema.org/InStock`, other statuses only when mapped (unmapped → no `availability`). Needs `status` in the record the public reader returns, so a guest-visible `status` field: the base `status` field is `visibility: 'admin'`, so guests (crawlers) get no `availability` unless the entity declares its own `status` with `visibility: 'guest'`. Availability that depends on private data (e.g. stock shown to professionals only) is not emitted: leave it unmapped.
- **Overrides:** entity `seo` option.

```ts
defineEntity({
  // ...
  seo: {
    title: (item, t) => t('seo.title', { size: item.size }), // null → no title
    description: (item, t) => null,                          // null → no description
    availability: { promoted: 'InStock', reserved: 'SoldOut', signed: 'SoldOut' },
  },
});
```

`t` is the entity namespace, then `crud`, in the page language (llms.txt: app default language). Custom field types (`registerFieldType`) are not known to core: their text is the raw value (also on the server, where the CRUD registry is not loaded). Use the field's `options.displayValue` (shared by card and SEO) or `seo.title`.

---

## Robots: `noindex`, Never robots.txt

Google's rule: robots.txt does not keep a page out of the index (a blocked URL linked elsewhere can still be indexed, without a description), and a `noindex` on a page robots.txt blocks is never read. So:

- **robots.txt** (generated, Vite and Next) disallows non-page paths only: `Disallow: /api`, and on Vite `Disallow: /_shell` (the SPA shell's own URL, `/_shell` and `/_shell.html`; the pages the hosting rewrites to it keep their URL and stay crawlable, so the shell carries no robots tag). Every page is crawlable, auth-only pages included. AI crawler groups (`appConfig.seo.aiCrawlers`) are separate.
- **Auth-only pages** (PageMeta `auth`): `<meta name="robots" content="noindex">` by default, from AutoMetaTags: in the server HTML on Next, in the browser on Vite (the Vite prerender skips auth pages). Out of the sitemap and llms.txt.
- **Opt back in:** `seo: { noindex: false }` (the page stays out of the sitemap). `seo: { noindex: true }` on any page: `noindex, nofollow`, out of the sitemap and llms.txt.
- **Next routes with server metadata** (entity pages, a page's own `generateMetadata`, blog posts): that metadata owns `robots`. `getMetadataForPath` (`@donotdev/core/next`) applies the same rule (`{ index: false }` on auth-only pages).

---

## Sitemap & llms.txt: One URL Set

Both list the same pages, generated from `src/pages` - no app code:

- **In:** public static routes, plus one URL per public record (`status` not in `HIDDEN_STATUSES`: any status except `draft`/`deleted`) of each single-param route whose page declares its entity (`/produits/:slug`, `entity: productEntity` → collection `products`). Never a `:param` template.
- **Out:** `auth.required` routes, `seo: { noindex: true }` routes, error routes (`/404`, `/not-found`, `/500`, `/error`) and catch-all routes (`/docs/*`: no URL list to expand them from).
- **RSS:** `<link rel="alternate" type="application/rss+xml">` to `/rss.xml` is in the head only when the app has blog posts (`src/content/blog/*_en.md`), the condition under which the feed is generated (`routes.manifest.hasBlogFeed`).
- **URLs:** absolute, from `seo.baseUrl` or `NEXT_PUBLIC_APP_URL` / `VITE_APP_URL`. **Deploy vs local build.** A deploy build (`dndev deploy`, which sets `DNDEV_DEPLOY=1`; a Vercel build, `VERCEL=1`; CI, `CI` set and not `false`) fails on a missing or local URL. A local build never fails because of the URL: it publishes the URL it has, localhost included, with one warning line. Without a usable URL, a local Vite build skips what needs one (sitemap.xml, llms.txt, robots.txt, rss.xml, canonical URLs, record pages: one warning line), and a local Next build uses `http://localhost:$PORT` (`next start`'s port, 3000 by default; `isDeployBuild` / `publishedBaseUrl` in core `config/utils/SEOGenerator.js`).
- **llms.txt labels (app default language):** page = its own title, without ` | SiteName` (`routeTitle` `pageTitle`, the Priority Chain's: `seo.title`, else the namespace `title`; a page without a `namespace`: its `seo.title` only); without one, its full title (`seo.fullTitle`, i18n `meta.fullTitle`), else the site name. A page without a title is listed under the site name on Vite and Next alike, never fails the build nor drops llms.txt; page description = `seo.description` → namespace `description`; entity record = `deriveEntitySeo` title/description (same as the entity page metadata), the site name for a record without a title (its page's title then); entity section = `namePlural` of its `entity-*` translations.
- **Prerendered pages (Next):** the same records fill each entity page's `generateStaticParams` and resolve its metadata (any other URL of the route is a 404) (`listStaticParams`, one route → collection decision `publicCollection`): every URL of the sitemap's dynamic routes is built at build time (`appConfig.prerenderRecords: false` to opt out).
- **Reader (Next):** records are read on the server as a signed-out visitor, from the app's public env, never a privileged key: `@donotdev/supabase` (`SupabasePublicReader` from `@donotdev/supabase/server`, RLS decides) or `@donotdev/firebase` (`FirestorePublicReader` from `@donotdev/firebase/public`, Firestore Security Rules decide; they must allow the whole `status not-in` query). Any other provider fails the build when a route lists records.
- **Read schema (Next and Vite):** every record read (sitemap, llms.txt, entity pages, Vite record pages) passes the entity's read schema (`entityReadSchemas`: `createSchemas(entity).get` per collection), so records keep the entity's field names (`availability_date` stays `availability_date`). The public reader filters nothing: it returns everything the database returns to a signed-out visitor (`SupabasePublicReader`: `select=*`; `FirestorePublicReader`: documents as stored, not validated), whatever a field's `visibility` (`status` and `updatedAt` feed availability and `lastmod`). RLS / Security Rules decide what is public; the derivations output only their own fields.
- **Next:** `src/app/sitemap.xml/route.next.ts` and `src/app/llms.txt/route.next.ts`, revalidated hourly (`appConfig.revalidate`: other lifetime in seconds, or `false` until the next deploy). Entity definitions and their read schemas come from the app's `entities` package, imported only when the app has entity routes; an entity route in an app without one fails the build (`[dndev-routes] <path> lists published "<collection>" records, read with their entity definition's read schema, but the app does not depend on an `entities` package ...`), the sitemap route included. A file the build fails to write (Next: robots.txt, rss.xml, seo-manifest.json, the sitemap.xml / llms.txt routes, llms-full.txt; Vite SEO plugin: robots.txt, rss.xml, seo-manifest.json, llms-full.txt, `_redirects`) fails a deploy build (`[dndev-seo] <files> not written: <cause>`) and is one warning line on a local build, the other files still written (`seoStep` in core `config/utils/SEOGenerator.js`, the URL check's rule); a build error (misconfigured app) fails every build.
- **Vite:** `dist/sitemap.xml` and `dist/llms.txt` written after the bundle with the Next builders (`buildSitemap`, `buildLlmsTxt`) over the same routes: every language URL with its alternates, records included (one read, shared with the record pages, same reader and env as Entity pages (Vite)). A record published later is listed by the next build.

---

## Checklist

- [ ] Set `namespace` in PageMeta for i18n-driven SEO
- [ ] Add `title`, `description`, `meta` to translation files
- [ ] Use `seo.fullTitle` to escape "Page | App" format
- [ ] Entity pages (Next and Vite): nothing to add; set PageMeta `seo.type` (`product`, `article`) and the entity's `seo` option when the card text is not the right title. Vite: the public reader's env at build (see Entity pages (Vite))
- [ ] Other dynamic pages (Next): export `generateMetadata` from a server page module
- [ ] Verify meta tags: View Source or browser DevTools

---

**Drop PageMeta, get SEO. Framework handles the rest.**
