# Pages & Routing

**Drop `*Page.tsx` files. Routes auto-discovered, navigation auto-generated, sitemap auto-built.**

---

## File Routing Rule

**CRITICAL: Only files ending in `Page.tsx` inside `src/pages` become routes.**

Files must be named `*Page.tsx` (e.g., `HomePage.tsx`, `AboutPage.tsx`, `BlogPostPage.tsx`). Files without the `Page.tsx` suffix are ignored by the routing system.

---

## PageMeta: Plain Text, No DRY Variables

**`export const meta: PageMeta = { ... };` must be a self-contained object literal.** Discovery reads source text; it does not import or execute the page module. Keep strings, booleans, arrays and nested objects inline. Do not extract metadata into shared constants, imported objects, spreads, helper calls or computed values. This includes `namespace`, `route` and `auth`: intentional duplication is required here. JSX navigation icons such as `icon: <Tags />` are explicitly supported.

```tsx
// WRONG: discovery cannot resolve the imported/shared object.
export const meta: PageMeta = { route: '/marques', auth: ADMIN_ONLY };

// CORRECT: all configuration is readable directly in the source.
export const meta: PageMeta = {
  namespace: 'brands',
  route: '/marques',
  auth: { required: true, role: 'admin' },
};
```

**An unresolved variable can discard the entire metadata object**, not just that field: custom URLs disappear, filename-derived routes replace them, and route auth defaults to public. A successful TypeScript check does not verify build-time metadata extraction.

---

## Standard Use

**Pattern:** `src/pages/**/*Page.tsx` - routes

**Basic page structure:**
```tsx
// src/pages/AboutPage.tsx
import { PageContainer } from '@donotdev/ui';

export const NAMESPACE = 'about';

export const meta: PageMeta = {
  namespace: 'about',
};

export default function AboutPage() {
  return <PageContainer><h1>About</h1></PageContainer>;
}
```

**Cookie-cutter pattern (Landing page):**
```tsx
import { PageContainer } from '@donotdev/ui';
import { HeroSection, Section, Card, CallToAction } from '@donotdev/components';

export default function HomePage() {
  return (
    <PageContainer>
      <HeroSection title="Welcome" subtitle="Build fast" variant="primary" />
      <Section title="Features" gridCols={3}>
        <Card title="Fast" />
        <Card title="Simple" />
        <Card title="Powerful" />
      </Section>
      <CallToAction title="Get Started" primaryAction={<Button>Sign Up</Button>} />
    </PageContainer>
  );
}
```

**Drop files, get routes. No config needed.**

**Component reference:** See the `@donotdev/components` guidelines for atomic components, and the COMPONENTS guideline for layout components.

---

## Advanced: All PageMeta Props

```tsx
export const meta: PageMeta = {
  // Translation/SEO namespace (inline literal, not a shared constant)
  namespace: 'about',

  // Route configuration
  route: '/custom-url',                    // Override auto-generated path
  route: { params: ['slug'] },            // Dynamic: /blog/:slug

  // Page title (optional - auto-extracted from filename)
  title: 'Custom Title',

  // Navigation icon (lucide-react JSX only)
  icon: <Rocket />,                        // Menu icon (default: Link)

  // Hide from navigation menu
  hideFromMenu: false,                     // Default: false (shows in nav)

  // Layout preset override (per-route)
  preset: 'admin',                         // Override app default for this route

  // Authentication
  auth: true,                              // Simple: auth required
  auth: { required: true },                // Explicit: auth required
  auth: { required: true, role: 'admin' }, // Role-based access
  auth: { required: true, tier: 'pro' },   // Tier-based access
  auth: {
    required: true,
    validate: (role, tier) => role === 'admin' && tier === 'pro'
  },                                       // Custom validation

  // Signed-in visitors go elsewhere (e.g. landing → catalogue)
  signedInRedirect: '/catalogue',          // Next + Supabase cookie: proxy redirects (verified session) before render; else client replace

  // Parent page when the URL prefix is no page (/produits/:slug, no /produits page)
  parent: '/catalogue',                    // Breadcrumbs, BreadcrumbList JSON-LD, forms' parent path (ROUTING guideline)
};
```

**`signedInRedirect`** sends signed-in visitors of the page to an app path. With a server-readable session (Next + Supabase `createBrowserClient`) the generated proxy verifies (and refreshes) the session, then redirects before render, so the page never flashes; an expired session whose refresh fails counts as signed out (see AUTH guideline, generated proxy); every app also wraps the page in `SignedInRedirect`, which navigates once the user is known (sign-in on the page, unreadable cookie). A pending return-to (`?returnTo=` or the saved `dndev.auth.returnTo`) skips it. The path must start with `/` and differ from the page's own path (build error otherwise).

**Route `auth` needs auth enabled.** With `AppConfig.auth: false` there are no auth routes to redirect to: a route whose `auth` check fails throws a config error in the redirect guard instead of redirecting. Enable `auth` in `AppConfig`, or remove the route's `auth`.

**Reference implementation:** The demo app (`packages/cli/templates/app-demo/`) shows all these patterns working together - landing, admin, docs presets, auth, showcase, CRUD, legal pages.

---

## Advanced: Dynamic Routes & Navigation

```tsx
// Dynamic route
export const meta: PageMeta = {
  namespace: 'blog',
  route: { params: ['slug'] },  // /blog/:slug
};

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  return <PageContainer><h1>{slug}</h1></PageContainer>;
}

// Manual navigation
import { useNavigate, Link } from '@donotdev/ui';
const navigate = useNavigate();
navigate('/about');
<Link path="/about">About</Link>

// Card with navigation (supports middle-click)
import { Card } from '@donotdev/components';
import { Link } from '@donotdev/ui';

<Link
  path="/about"
  style={{ display: 'block', textDecoration: 'none', height: '100%' }}
  aria-label="Learn more about About"
>
  <Card title="About" subtitle="Learn more" />
</Link>
```

**Navigation patterns:**
- **Link component:** Use for text links, buttons, or wrapping other components
- **Card navigation:** Wrap Card in Link for clickable cards with middle-click support
- **onClick only:** Use `onClick={() => navigate()}` for actions that don't need middle-click

**Pre-configured:** Navigation menu auto-generated, sitemap auto-built (if `generateSitemap: true`).

---

---

## Import Convention

**Always import from `@donotdev/<package>` top-level.** Never use sub-paths.

```tsx
import { PageContainer, Link, useNavigate } from '@donotdev/ui';
import { Card, Button, Input } from '@donotdev/components';
import { useCrud } from '@donotdev/crud';
```

**Sub-path exceptions** (server, config, and provider-specific):
- **Server:** `@donotdev/core/server`, `@donotdev/firebase/server`, `@donotdev/security/server`
- **Server components (Next only):** `@donotdev/core/rsc` (`useTranslation`, `setRequestLanguage`; see core `I18N.md`), `@donotdev/components/rsc`, `@donotdev/ui/rsc`. They resolve only in React Server Components (`react-server` condition); importing them anywhere else fails the build.
- **Config:** `@donotdev/core/vite`, `@donotdev/core/next`, `@donotdev/core/functions`

**`@donotdev/components/rsc` / `@donotdev/ui/rsc`** export the same names as the package root. Presentational components (Stack, Text, Grid, Button…) render on the server. Interactive ones (hooks, Radix, context, event handlers, browser APIs: Card, Dialog, PageContainer…) carry their own `'use client'` and render as client islands. Calling one of their hooks or helpers from a server component throws. The package roots (`@donotdev/components`, `@donotdev/ui`) are unchanged: client barrels everywhere, including server files. Nothing imports the `/rsc` entries yet, so apps render exactly as before until a later phase adopts them. Vite never uses them.
- **Functions:** `@donotdev/functions/firebase`, `@donotdev/functions/vercel`, `@donotdev/functions/supabase`

---

## SaaS App Pattern

For SaaS apps, the standard page structure is:

```
src/pages/
  HomePage.tsx        -> /           -> No auth. Login form OR landing page.
                                      Redirects to /dashboard when authenticated.
  DashboardPage.tsx   -> /dashboard  -> auth: true. Main landing for logged-in users.
  SettingsPage.tsx    -> /settings   -> auth: true.
  ...
```

**HomePage is never auth-guarded.** It's the entry point for unauthenticated users. Do NOT create a separate `LoginPage` - HomePage IS the login.

```tsx
// src/pages/HomePage.tsx - SaaS pattern
import { useAuthSafe, useNavigate, PageContainer } from '@donotdev/ui';
import { LoginForm } from '@donotdev/templates';

export const meta: PageMeta = {
  namespace: 'home',
  // No auth - this is the public entry point
};

export default function HomePage() {
  const user = useAuthSafe('user');
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  if (user) { navigate('/dashboard'); return null; }

  return (
    <PageContainer>
      <LoginForm onSuccess={() => navigate('/dashboard')} />
    </PageContainer>
  );
}
```

> **Why `useAuthSafe` instead of `useAuth`?** HomePage is public - it renders before auth is guaranteed to be initialized. `useAuthSafe` (from `@donotdev/ui`) gracefully degrades if `@donotdev/auth` isn't installed or still initializing. `useAuth` (from `@donotdev/auth`) throws if auth isn't available. Use `useAuthSafe` on any page without `auth: true` in its meta.

---

**Drop files, get routes. Framework handles the rest.**
