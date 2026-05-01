# SEO & Meta Tags

**Same `PageMeta` works on Vite and Next.js. i18n-first by default.**

---

## How It Works

**Vite:** AutoMetaTags reads route manifest + i18n - Helmet renders meta tags
**Next.js:** Build generates `metadata-manifest.json` - `generateMetadata()` per page

**Same code, both platforms. No conditional logic needed.**

---

## Why This Matters: Crawlers & Initial HTML

**Problem:** Google/social crawlers don't execute JavaScript. They read the initial HTML.

**SPA without SSR:** Meta tags injected client-side - crawlers see empty `<head>` - bad SEO.

**With framework:**

| Platform | Static Pages | Dynamic Pages |
|----------|--------------|---------------|
| **Vite** | Prerender at build - meta in HTML | `<Seo>` + react-helmet-async - meta in prerendered HTML |
| **Next.js** | `generateMetadata()` - server renders meta | `<Seo>` client-side OR `generateMetadata()` with fetch |

**Verify:** View Page Source (not DevTools). Meta tags should be visible without JS.

---

## Vite: Prerendering

**Enabled by default** in `vite.config.ts`:

```ts
export default defineViteConfig({
  prerender: true,  // Default: true
});
```

**What happens:**
1. Build discovers all routes from `src/pages/`
2. Renders each page to static HTML
3. `<Seo>` and AutoMetaTags populate `<head>` via react-helmet-async
4. Output: `dist/about/index.html` with full meta tags

**Dynamic routes** (e.g., `/products/:id`): Prerender with known IDs or use client-side `<Seo>`.

---

## Next.js: Server Rendering

**Automatic.** Each page's `generateMetadata()` runs server-side.

**Static pages:** Meta resolved at build time from `metadata-manifest.json`.
**Dynamic pages:** Use `generateMetadata()` with `fetch()` or client-side `<Seo>`.

```tsx
// Server-rendered metadata for dynamic route
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await fetch(`/api/products/${params.id}`).then(r => r.json());
  return { title: product.name, description: product.description };
}
```

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
    noindex: true,              // Hide from search engines
  },
};
```

---

## Priority Chain

Resolution order (highest to lowest):

1. **`<Seo>` component** - Runtime dynamic data (always wins)
2. **i18n `meta.fullTitle`** - Translated, language-aware
3. **`seo.fullTitle`** - Static fallback
4. **i18n `title`** - "Translated | SiteName"
5. **`seo.title`** - "Static | SiteName"
6. **SiteName only** - Default fallback

---

## Dynamic Data: `<Seo>` Component

**Pattern:** For pages with runtime data (fetched content), use `<Seo>`.

```tsx
import { Seo } from '@donotdev/ui';

export const meta: PageMeta = {
  namespace: 'apartments',
  route: { params: ['id'] },
};

export default function ApartmentPage() {
  const { id } = useParams<{ id: string }>();
  const { data: apartment } = useApartment(id);

  if (!apartment) return <Loading />;

  return (
    <>
      <Seo
        fullTitle={`${apartment.reference} - ${apartment.rent} | SiteName`}
        description={apartment.description}
        image={apartment.photos[0]}
        type="product"
      />
      <ApartmentDetails data={apartment} />
    </>
  );
}
```

**Works in SSR/prerender** - meta tags are in initial HTML.

---

## `<Seo>` Props

```tsx
<Seo
  // Title (pick one)
  title="Page Title"           // "Page Title | SiteName"
  fullTitle="Exact Title"      // "Exact Title"

  // Content
  description="Page description"
  image="/og-image.png"
  type="website"               // 'website' | 'article' | 'product'
  keywords={['key1', 'key2']}
  noindex={false}

  // Article-specific
  publishDate="2024-01-15T00:00:00Z"
  modifiedDate="2024-01-20T00:00:00Z"

  // URL
  canonicalUrl="https://example.com/page"
/>
```

---

## Hook Alternative

```tsx
import { useSeo } from '@donotdev/ui';

export default function ProductPage() {
  const { data: product } = useProduct(id);

  const SeoTags = useSeo(product ? {
    title: product.name,
    description: product.description,
    image: product.image,
  } : null);

  return (
    <>
      <SeoTags />
      <ProductDetails data={product} />
    </>
  );
}
```

---

## Next.js: Manual `generateMetadata`

For advanced cases, override in the page file:

```tsx
// src/app/products/[id]/page.tsx (manual, not generated)
import type { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await fetchProduct(params.id);
  return {
    title: `${product.name} | Store`,
    description: product.description,
    openGraph: { images: [product.image] },
  };
}
```

**For static pages, framework handles this automatically.**

---

## Checklist

- [ ] Set `namespace` in PageMeta for i18n-driven SEO
- [ ] Add `title`, `description`, `meta` to translation files
- [ ] Use `seo.fullTitle` to escape "Page | App" format
- [ ] Use `<Seo>` for pages with dynamic/fetched data
- [ ] Verify meta tags: View Source or browser DevTools

---

**Drop PageMeta, get SEO. Framework handles the rest.**
