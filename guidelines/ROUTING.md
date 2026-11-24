# Routing

**Use framework routing components/hooks. NEVER import from `react-router-dom` directly.** Framework handles SPA navigation, Outlet, and overlay closing automatically.

---

## Critical Rule: Never Use react-router-dom Directly

**WRONG:**
```tsx
import { Link, useNavigate, useParams } from 'react-router-dom'; // BREAKS FRAMEWORK
```

**CORRECT:**
```tsx
import { Link, useNavigate, useParams } from '@donotdev/ui'; // Framework routing
```

**Why?** The framework's routing components:
- Automatically close overlays on navigation
- Handle SPA navigation correctly with Outlet
- Work with both Vite and Next.js
- Integrate with auth and route discovery
- Provide proper TypeScript types

---

## Framework Routing API

### Components

```tsx
import { Link, DnDevNavigationMenu } from '@donotdev/ui';
```

**Link Component:**
```tsx
<Link path="/products" label="Products" icon="Package" />
<Link path="/users/:id" replace prefetch={false}>User Details</Link>
```

Internal paths render a real `<a href>` on both platforms (via `@donotdev/ui/routing/link`, resolved like `routing/hooks`):
- **Next.js:** `next/link`. `prefetch` (default `true`): guests get next/link's default prefetch (production only: static routes fully, dynamic routes up to the nearest `loading.js`); signed-in visitors (`useAuth('isAuthenticated')`, cookie snapshot until the provider is ready) get `prefetch={true}`, the full route of each visible link, because their pages render per request (session tree) and the default skips them. `prefetch={false}` disables it for everyone. An `onClick` calling `preventDefault()` cancels the navigation.
- **Vite:** `<a href>` navigated by react-router; `prefetch` has no effect.
- Modifier / middle clicks keep the browser default (new tab). External URLs (`http(s)`, `mailto:`, `tel:`) are plain `<a target="_blank">`. Cards (`href`) and Tables render links through `Link`, so they get the same behaviour.
- String `icon` names (`"Package"`) load per icon (own chunk); prefer an imported component (`icon={Package}`) for server-rendered icons.

**DnDevNavigationMenu (Sidebar/Header):**
```tsx
// Auto-fetches routes, handles auth filtering
<DnDevNavigationMenu vertical display={DISPLAY.AUTO} />
```
The link of the current route gets `aria-current="page"` + `data-active="true"` (exact match, or the route is nested under the item's path; `/` matches exactly only). A parent item is active when one of its children is. Also applies to the header overflow ("More") dropdown.

### Hooks

```tsx
import {
  useNavigate,
  useLocation,
  useRoutePath,
  useParams,
  useRouteParam,
  useSearchParams,
  useNavigationItems,
} from '@donotdev/ui';
```

**Path only? `useRoutePath()`.** It returns the route path (no language prefix) without reading the query string. On Next, pages are cached (static): reading the query (`useSearchParams`, `useLocation().search`) renders that page in the browser instead of the cached HTML. Read the query only where it is needed, in a small component inside its own `<Suspense>`: generated Next pages have no page-wide boundary (it would delay the whole page past the first paint), and `next build` fails on a query read with no boundary around it.

---

## NotFoundPage: static fallback and translation compatibility

`<NotFoundPage />` still displays the current route path by default. Set
`showRequestedPath={false}` for a cached/shared fallback: its build-time pathname
is not the URL of a later request. Framework-generated Next not-found and global
not-found wrappers opt into this generic, badge-free content. This prop hides only
the path badge; translated labels, route suggestions and Home/Back actions remain
server-renderable. It does not disable SSR or defer navigation until mount.

A Next page answers 404 with Next's `notFound()` (`next/navigation`; entity pages
get it generated). The framework error boundaries re-throw Next's router control flow
(`notFound()`, `forbidden()`, `unauthorized()`, `redirect()`), so the app's 404 page
shows, not the error fallback.

The badge is not the only URL-derived output. The static Next 404 is built once (at
`/_not-found`) and served for every unknown URL, so anything computed from the
pathname differs between its HTML and the browser's render (React #418). The
generated not-found and global not-found pages wrap their tree in
`<NotFoundDocument>` (`@donotdev/ui`): inside it, `AutoMetaTags` emits no canonical
link and no URL-derived JSON-LD, and `Breadcrumbs` renders nothing. A hand-written
shared 404 must do the same. Apps that set `breadcrumbs: 'never'` in their layout
still need it for the head tags.

The canonical translation text is `dndev:messages.notFound.*`. Framework eager
locales expose `errors.notFound.{title,description,suggestions,navigateTo,goHome,goBack}`
as explicit i18next `$t(messages.notFound.<key>)` compatibility references, not
copies. The component keeps its legacy `errors.notFound.*` lookups so existing
consumer overrides continue to work. Consumer locale resources are deep-merged
over framework resources: a legacy override wins for that field; otherwise its
reference resolves the canonical value, including a consumer canonical override.
If both families override the same field, the legacy override wins. Prefer
`messages.notFound.*` for new overrides; remove an old field override when migrating
it to canonical. `navigateTo` interpolates `{{label}}`. The component passes no
default text: a missing resource shows its key; there is no runtime key-family fallback chain.

---

## Navigation Patterns

### 1. Basic Navigation

**Use framework Link:**
```tsx
import { Link } from '@donotdev/ui';

function ProductCard({ product }) {
  return (
    <Link path={`/products/${product.id}`} label={product.name} />
  );
}
```

**Use framework useNavigate:**
```tsx
import { useNavigate } from '@donotdev/ui';

function ProductForm() {
  const navigate = useNavigate();

  const handleSubmit = async () => {
    await saveProduct();
    navigate('/products'); // Closes overlays automatically
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**Loading state while the next page loads:** destructure `pending` (true until the new route has rendered; navigation runs in a React transition):
```tsx
const { navigate, pending } = useNavigate();

<Button loading={pending} onClick={() => navigate('/checkout')}>{t('checkout')}</Button>
```
Overlays still close at the click, so a button inside a framework Dialog/Sheet will not show its spinner.

**DON'T use react-router-dom:**
```tsx
import { useNavigate } from 'react-router-dom'; // BREAKS FRAMEWORK

function ProductForm() {
  const navigate = useNavigate(); // Doesn't close overlays, breaks SPA
  // ...
}
```

---

### 2. Route Parameters

**Use framework useRouteParam:**
```tsx
import { useRouteParam } from '@donotdev/ui';

function ProductPage() {
  const id = useRouteParam('id'); // Returns string | undefined
  // Safe: handles string | string[] | undefined automatically
}
```

**Or use framework useParams:**
```tsx
import { useParams } from '@donotdev/ui';

function ProductPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : undefined;
}
```

**DON'T use react-router-dom:**
```tsx
import { useParams } from 'react-router-dom'; // Type issues, breaks framework
```

---

### 3. Sidebar Navigation

**Use DnDevNavigationMenu (auto-fetches routes):**
```tsx
import { DnDevNavigationMenu, DISPLAY } from '@donotdev/ui';

function Sidebar() {
  return (
    <DnDevNavigationMenu
      vertical
      display={DISPLAY.AUTO} // CSS-driven collapse
      showIcons={true}
    />
  );
}
```

**Or use useNavigationItems for custom sidebar:**
```tsx
import { Link, useNavigationItems } from '@donotdev/ui';

function CustomSidebar() {
  const menuItems = useNavigationItems(); // Auth-filtered routes

  return (
    <nav>
      {menuItems.map((item) => (
        <Link
          key={item.path}
          path={item.path}
          label={item.label}
          icon={item.icon}
          className={item.isActive ? 'active' : ''}
        />
      ))}
    </nav>
  );
}
```

**SSR snapshot ownership:** `useNavigationItems()` and `useAccessibleNavigationRoutes()` subscribe to route data and update when either routes or auth change. For lower-level render derivation, select `state.cache.allRoutes` and call the pure `filterNavigationRoutes(routes, authState)` exported by `@donotdev/core` outside the store selector. Do not invoke `state.getFilteredRoutes()` inside a render selector: imperative getters read live state rather than the hydration snapshot. Existing imperative getters remain supported for event-time reads.

**DON'T manually build navigation:**
```tsx
import { Link } from 'react-router-dom'; // BREAKS FRAMEWORK

function Sidebar() {
  // Doesn't integrate with route discovery
  // Doesn't handle auth filtering
  // Doesn't work with Outlet
  return (
    <nav>
      <Link to="/products">Products</Link>
    </nav>
  );
}
```

---

### 4. Programmatic Navigation

**Use framework useNavigate:**
```tsx
import { useNavigate } from '@donotdev/ui';

function LoginForm() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    await signIn();
    navigate('/dashboard', { replace: true }); // Closes overlays
  };

  return <form onSubmit={handleLogin}>...</form>;
}
```

**Navigate back:**
```tsx
const navigate = useNavigate();
navigate('back'); // Framework handles browser history
```

**With options:**
```tsx
navigate('/products', {
  replace: true,        // Replace history entry
  preserveScroll: true, // Preserve scroll position
});
```

---

### 5. Query Parameters

**Use framework useSearchParams (read-only, returns URLSearchParams directly):**
```tsx
import { useSearchParams } from '@donotdev/ui';

function ProductList() {
  const searchParams = useSearchParams();
  const page = searchParams.get('page') || '1';

  return <div>Page: {page}</div>;
}
```

**Or use useQueryParams helper:**
```tsx
import { useQueryParams } from '@donotdev/ui';

function ProductList() {
  const { page, sort } = useQueryParams({ page: '1', sort: 'name' });
  // Returns { page: string, sort: string } with defaults
}
```

---

### 6. Route Matching

**Use framework useMatch:**
```tsx
import { useMatch } from '@donotdev/ui';

function NavigationItem({ path }) {
  const isActive = useMatch(path);
  return <Link path={path} className={isActive ? 'active' : ''} />;
}
```

---

## Outlet and Nested Routes

**Framework handles Outlet automatically.** You don't need to manually use `<Outlet />` in most cases.

### How It Works

1. **RootLayout** wraps all routes and includes `<Outlet />`
2. **DnDevLayout** receives `<Outlet />` and renders it in the main content area
3. **Routes are discovered** from `src/pages/*Page.tsx` files automatically

**Your pages just render content:**
```tsx
// src/pages/ProductsPage.tsx
export function ProductsPage() {
  return <div>Products List</div>; // Rendered via Outlet automatically
}
```

**DON'T manually use Outlet:**
```tsx
import { Outlet } from 'react-router-dom'; // BREAKS FRAMEWORK

export function ProductsPage() {
  return (
    <div>
      <h1>Products</h1>
      <Outlet /> {/* Framework already handles this */}
    </div>
  );
}
```

### Nested Routes (Advanced)

If you need nested routes, use the framework's route discovery:

```tsx
// src/pages/products/ProductsPage.tsx
export const pageMeta = {
  route: '/products',
  // ...
};

// src/pages/products/ProductDetailPage.tsx
export const pageMeta = {
  route: '/products/:id',
  // ...
};
```

Framework automatically creates nested route structure.

---

## Route Discovery

**Routes are auto-discovered from `src/pages/*Page.tsx` files.**

**Define routes with PageMeta:**
```tsx
// src/pages/ProductsPage.tsx
import type { PageMeta } from '@donotdev/core';

export const pageMeta: PageMeta = {
  title: 'Products',
  route: '/products',
  icon: 'Package',
  auth: { required: true, roles: ['user', 'admin'] },
};

export function ProductsPage() {
  return <div>Products</div>;
}
```

**Framework automatically:**
- Discovers routes from filesystem
- Generates navigation menus
- Filters by auth permissions
- Handles lazy loading
- Creates route structure

### Parent page and breadcrumbs

A page's ancestors are its URL prefixes that are pages (`/routines/:id` → `/routines`). A
page whose URL prefix is no page names its parent with PageMeta `parent`:

```tsx
// src/pages/ProductPage.tsx: /produits/:slug, no /produits page; the catalogue lists them
export const meta: PageMeta = {
  route: '/produits/:slug',
  entity: productEntity,
  parent: '/catalogue',
};
```

One chain (`routeAncestors` in `@donotdev/core`: the direct URL prefix when it is a page,
else `parent`, else the nearest shorter prefix that is a page, then the parent's own chain)
feeds the visible `Breadcrumbs` (Home > Catalogue > product), every BreadcrumbList JSON-LD
(see SEO.md) and the forms' parent path (cancel / after save). Each crumb is named by its
page's title (the `<title>` chain: `seo.title`, else `<namespace>:title`; `routeLabel`);
a URL prefix that is no page is no crumb; the shown record keeps its name
(`useRecordBreadcrumb`). The trail reads the build's route manifest, so the server HTML and
the browser render are identical.

`parent` is read at build like `route`: a literal static path of an existing page
(`/x`, no `:param`, `*`, query or hash), `'/'` for home. The build fails on any other
value, on the page itself, on a loop, and when the URL prefix is itself a page (it is the
parent already: remove `parent`).

---

## Common Mistakes

### Mistake 1: Importing from react-router-dom

```tsx
// WRONG
import { Link, useNavigate } from 'react-router-dom';
```

**Fix:**
```tsx
// CORRECT
import { Link, useNavigate } from '@donotdev/ui';
```

---

### Mistake 2: Manual Outlet Usage

```tsx
// WRONG
import { Outlet } from 'react-router-dom';

export function Layout() {
  return <Outlet />; // Framework already handles this
}
```

**Fix:** Don't use Outlet manually. Framework handles it.

---

### Mistake 3: Manual Route Configuration

```tsx
// WRONG
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/products" element={<ProductsPage />} />
    </Routes>
  );
}
```

**Fix:** Use route discovery. Create `src/pages/ProductsPage.tsx` with `pageMeta`.

---

### Mistake 4: Manual Navigation Menu

```tsx
// WRONG
function Sidebar() {
  return (
    <nav>
      <Link to="/products">Products</Link>
      <Link to="/users">Users</Link>
    </nav>
  );
}
```

**Fix:**
```tsx
// CORRECT
import { DnDevNavigationMenu } from '@donotdev/ui';

function Sidebar() {
  return <DnDevNavigationMenu vertical />; // Auto-fetches routes
}
```

---

### Mistake 5: Not Using Framework Link

```tsx
// WRONG
import { Link } from 'react-router-dom';

<Link to="/products">Products</Link>
```

**Fix:**
```tsx
// CORRECT
import { Link } from '@donotdev/ui';

<Link path="/products" label="Products" />
```

---

## Quick Reference

### Import Paths

```tsx
// Framework routing (platform-agnostic)
import {
  Link,
  useNavigate,
  useLocation,
  useRoutePath,
  useParams,
  useRouteParam,
  useSearchParams,
  useNavigationItems,
  DnDevNavigationMenu,
} from '@donotdev/ui';
```

### Common Patterns

```tsx
// Navigation
const navigate = useNavigate();
navigate('/products');
navigate('back');
navigate('/products', { replace: true });

// Route params
const id = useRouteParam('id');

// Query params (read-only, returns URLSearchParams directly)
const searchParams = useSearchParams();
const page = searchParams.get('page');

// Navigation menu
const menuItems = useNavigationItems(); // Auth-filtered routes

// Link component
<Link path="/products" label="Products" icon="Package" />
```

---

## Summary

1. **Always import from `@donotdev/ui`** - never `react-router-dom`
2. **Use `DnDevNavigationMenu`** for sidebars/headers
3. **Use `useNavigationItems()`** for custom navigation
4. **Don't use `<Outlet />` manually** - framework handles it
5. **Routes are auto-discovered** from `src/pages/*Page.tsx`
6. **Framework closes overlays** on navigation automatically

**Framework handles SPA navigation, Outlet, and route discovery. Use framework components/hooks only.**
