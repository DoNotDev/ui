# @donotdev/ui

Complete UI system and provider architecture for the DoNotDev Framework.

## Installation

```bash
npm install @donotdev/ui
# or
bun install @donotdev/ui
```

## License

MIT. See [LICENSE.md](./LICENSE.md).

## Quick Start

### Vite Applications

```tsx
import { ViteAppProviders } from '@donotdev/ui/vite';
import HomePage from './pages/HomePage';

export function App() {
  return (
    <ViteAppProviders
      config={{
        app: { name: 'My App' },
        layout: { preset: 'landing' },
      }}
      LandingPage={HomePage}
    />
  );
}
```

### Next.js Applications

```tsx
import { NextJsAppProviders } from '@donotdev/ui/next';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <NextJsAppProviders
          config={{
            app: { name: 'My App' },
            layout: { preset: 'landing' },
          }}
        >
          {children}
        </NextJsAppProviders>
      </body>
    </html>
  );
}
```

## Configuration

### App Configuration

All configuration is passed through a single `config` prop with smart defaults:

```tsx
<ViteAppProviders
  config={{
    app: {
      name: 'My Application',
      description: 'Built with DoNotDev',
      logo: '/logo.svg',
    },
    auth: {
      authRoute: '/signin', // Default: '/login'
      roleRoute: '/403', // Default: '/404'
      tierRoute: '/pricing', // Default: '/404'
    },
    seo: {
      baseUrl: 'https://example.com',
      defaultImage: '/og-image.png',
    },
    layout: {
      preset: 'admin', // Use LAYOUT_PRESET constants from @donotdev/types
      footerPosition: 'fixed',
      breadcrumbs: 'smart',
    },
    features: {
      debug: true, // Auto-detects isDev() by default
    },
  }}
  LandingPage={HomePage}
  layout={{
    header: { end: () => <LoginButton /> },
    footer: () => <CustomFooter />,
  }}
/>
```

### Minimal Configuration

Everything has defaults - only override what you need:

```tsx
<ViteAppProviders LandingPage={HomePage} />
```

## Layout Presets

The framework includes professional layout presets:

- **`landing`** - Marketing sites (header + footer)
- **`admin`** - Admin dashboards (header + sidebar + footer)
- **`docs`** - Documentation (sidebar + footer)
- **`moolti`** - SaaS apps (sidebar only)
- **`dashboard`** - Data dashboards (header + sidebar + footer)
- **`plain`** - Minimal (content only)

## Layout Customization

### Layout Overrides

Customize specific zones without rebuilding layouts:

```tsx
<ViteAppProviders
  layout={{
    preset: 'admin',
    header: {
      start: () => <CustomLogo />,
      center: () => <SearchBar />,
      end: () => <UserMenu />,
    },
    sidebar: {
      top: () => <Branding />,
      content: () => <Navigation />,
      bottom: () => <UserProfile />,
    },
    footer: () => <CustomFooter />,
  }}
/>
```

**Simple API:**
- `preset?: string` - Layout preset name (default: 'landing')
- `header?: DnDevOverride | { start?, center?, end? }` - Full override or slot overrides
- `footer?: DnDevOverride` - Full footer override
- `sidebar?: DnDevOverride | { top?, content?, bottom? }` - Full override or slot overrides
- `mergedbar?: DnDevOverride | { trigger?, top?, content?, bottom? }` - Mobile navigation override

**Slot override behavior:**
- Omit property → Uses preset defaults merged with framework defaults
- `() => null` → Explicitly hides the slot (no content rendered)
- `() => ReactNode` → Custom component override

All overrides are lazy functions: `() => ReactNode | null` - components load when rendered, not in provider tree.

**Example:**
```tsx
layout={{
  header: {
    center: () => null,  // Hide center slot
    end: () => <MyCustomActions />  // Override end slot
    // start omitted → uses defaults
  }
}}
```

### CSS Variable Overrides

Fine-tune layout dimensions:

```tsx
<ViteAppProviders
  config={{
    layout: {
      preset: 'admin',
      overrides: {
        '--header-height': '96px',
        '--sidebar-width': '320px',
        '--main-padding': '2rem',
      },
    },
  }}
/>
```

## Components

### Layout Components

Access config anywhere with hooks:

```tsx
import { useAppConfig } from '@donotdev/hooks';

function Header() {
  const name = useAppConfig('name');
  const url = useAppConfig('url');
  return <h1>{name}</h1>;
}
```

### SEO Components

Automatic SEO meta tags:

```tsx
// SEO is automatic - uses useSeoConfig() internally
// Configure via config.seo
```

### Favicon System

Automatic PWA-compliant favicons:

```tsx
// Favicon is automatic - uses useFaviconConfig() internally
// Configure via config.favicon
```

## Provider Hierarchy

```
AppConfigProvider (configuration context)
  ↓
HelmetProvider (head management)
  ↓
StoresInitializer (state management)
  ↓
NavigationProvider (routing)
  ↓
QueryProviders (React Query)
  ↓
UIProviders (design system)
  ↓
Layout + Content
```

## Platform Support

### Vite Features

- React Router integration
- Virtual module imports
- SPA optimization
- Fast HMR

### Next.js Features

- App Router integration
- Server-side rendering
- Static generation
- Server components

## TypeScript Support

Full TypeScript support with intelligent defaults:

```tsx
import type { AppConfig } from '@donotdev/types';

const config: AppConfig = {
  app: { name: 'My App' },
  layout: { preset: 'admin' },
};
```

## Exports

### Platform-Specific

```tsx
import { ViteAppProviders } from '@donotdev/ui/vite';
import { NextJsAppProviders } from '@donotdev/ui/next';
```

### Components

```tsx
import { Layout, Breadcrumbs, GlobalGoTo } from '@donotdev/ui';
```

### Hooks (Re-exported from @donotdev/hooks)

```tsx
import {
  useAppConfig,
  useAppMetadata,
  useAuthConfig,
  useSeoConfig,
  useFaviconConfig,
  useFeaturesConfig,
} from '@donotdev/ui';
```

---

**Package:** @donotdev/ui  
**Version:** 1.0.0  
**Author:** AMBROISE PARK Consulting
