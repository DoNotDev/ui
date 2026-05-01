# Layouts

**Choose preset in `config/app.ts`. Framework handles header, sidebar, footer, auth, themes, languages.**

---

## Standard Use

**Choose preset:**
```typescript
// config/app.ts
export const appConfig: AppConfig = {
  preset: 'landing', // landing | admin | moolti | docs | blog | game | plain
};
```

**7 presets:** `landing` (marketing), `admin` (dashboards), `moolti` (SaaS), `docs` (documentation), `blog` (content), `game` (mobile), `plain` (minimal).

---

## Preset Capabilities

**The `docs` preset AUTOMATICALLY generates sidebar navigation from your `src/pages` files. You do not need to configure a sidebar manually.**

All presets automatically include these components when applicable:

*   **LanguageSelector** - Automatically shown if more than 1 language is configured
*   **ThemeToggle** - Automatically shown if more than 1 theme is available
*   **AuthMenu** - Automatically shown if auth is configured in `.env` (Firebase keys present)
*   **Navigation Menu** - Automatically generated from `src/pages/*Page.tsx` files for sidebars
*   **GoTo Component** - Command palette (Cmd+K) for quick navigation - always available
*   **Footer** - Automatic footer with copyright and legal links
*   **LegalLinks + Copyright** - Automatically included in footer from `config/legal.ts`

**You don't need to add these manually - the framework handles them based on your configuration.**

---

## Per-Route Layout Switching

**Override the app preset on a per-page basis via `PageMeta.preset`:**

```tsx
// src/pages/DashboardPage.tsx
import type { PageMeta } from '@donotdev/core';

export const meta: PageMeta = {
  preset: 'admin',  // This route uses admin layout (sidebar, compact density)
  auth: true,
};
```

- If `preset` is set - that route uses the specified layout
- If `preset` is absent - the app's `appConfig.preset` is used
- The override is **transient** - navigating away restores the next route's preset or the app default
- No localStorage pollution - route presets are not persisted

**Common pattern (SaaS app):**
| Route | Preset | Purpose |
|-------|--------|---------|
| `/` | (app default: `landing`) | Marketing landing page |
| `/pricing` | (app default: `landing`) | Pricing page |
| `/dashboard` | `admin` | Dashboard with sidebar |
| `/products` | `admin` | CRUD with sidebar |
| `/changelog` | `docs` | Documentation layout |

**Reference implementation:** See `packages/cli/templates/app-demo/` for a working example of per-route switching.

---

## Custom Presets

**Define your own presets with the same `PresetConfig` shape as built-ins.**

`config/app.ts` is strings-only (no React, no JSX). Custom presets with components go in `App.tsx`.

### Zone ownership: slots vs functions

Each zone (header, sidebar, footer) supports two config modes:

| Config shape | What it means | Framework provides |
|---|---|---|
| **Object** (slots) | "I want your layout, my content" | Structure + behavior + visual polish |
| **Function** | "I own this zone" | Structure + behavior only, no visual polish |
| **`null`** | "Hide it" | Nothing |

**Slots mode** (object) - fill framework slots, get framework styling (background, border, padding):
```tsx
sidebar: {
  top: () => <MyBranding />,
  content: () => <MyNav />,
  bottom: () => <MyProfile />,
  defaultWidth: 280,
}
```

**Custom mode** (function) - own the zone visuals, framework provides structural behavior (resize, sticky, grid placement):
```tsx
sidebar: () => <MyFullSidebar />,
```

In custom mode:
- **Sidebar** gets resize handle, keyboard nav, collapse for free. No framework background/border.
- **Header** gets grid-area, height, sticky, z-index. No framework background/border/padding.
- **Footer** gets grid-area, z-index, grid-column span. No framework background/border/min-height/padding.

**Your component must NOT render the semantic wrapper** (`<aside>`, `<header>`, `<footer>`) - the framework handles that. Render a `<div>` or fragment as your root.

### Example: custom preset with full zone ownership

```tsx
// App.tsx
import type { LayoutPreset, PresetConfig } from '@donotdev/core';
import { ViteAppProviders } from '@donotdev/ui/vite';

import { MyGameHud } from './components/MyGameHud';
import { MyToolPanel } from './components/MyToolPanel';
import { appConfig } from './config/app';

const customPresets: Record<string, PresetConfig> = {
  'my-editor': {
    name: 'my-editor' as LayoutPreset,
    sidebar: () => <MyToolPanel />,       // Custom visuals, resize for free
    footer: () => <MyGameHud />,          // Custom visuals, fixed at bottom
    footerMode: 'fixed',                  // Stays pinned on mobile too
    mobile: {
      mergedBar: {
        position: 'top',
        height: '62px',
        content: () => <MyToolPanel />,
      },
    },
  },
};

export function App() {
  return (
    <ViteAppProviders
      config={{ ...appConfig, customPresets }}
    />
  );
}
```

### Example: custom preset with slot overrides (framework polish)

```tsx
const customPresets: Record<string, PresetConfig> = {
  'my-docs': {
    name: 'my-docs' as LayoutPreset,
    sidebar: {
      content: () => <MyDocNav />,        // Custom content, framework styling
      defaultWidth: 300,
      minWidth: 200,
      maxWidth: 400,
    },
    footer: null,                         // No footer
  },
};
```

### CSS variables for custom presets

**Add CSS variables in `src/themes.css`:**
```css
[data-layout='my-editor'] {
  --header-height: 0px;
  --sidebar-width: 280px;
  --custom-sidebar-width: 286px; /* content + 6px resize handle */

  header[role='banner'] { display: none; }

  @media (width <= 1023px) {
    --sidebar-width: 0px;
  }
}
```

**Use on a page:**
```tsx
export const meta: PageMeta = {
  preset: 'my-editor',
};
```

**How it works:**
1. `customPresets` merged into config in `App.tsx` - flows through `AppConfigProvider`
2. Page sets `preset: 'my-editor'` - store accepts any string
3. `DnDevLayout` looks up `'my-editor'` in merged registry (custom overrides built-in)
4. Zones render from your `PresetConfig` - function zones get `data-custom` attribute, slots don't
5. `data-layout="my-editor"` on `<html>` - your CSS variables activate
6. Mobile: mergedBar shows automatically, header hidden via `data-has-mergedbar`

**Unknown presets without a custom config fall back to `landing`.**

---

## Advanced: Slot Overrides

**Customize zones (framework polish applies):**
```tsx
<ViteAppProviders
  config={appConfig}
  layout={{
    header: {
      start: () => <CustomLogo />,    // Override start zone
      center: () => <SearchBar />,     // Override center zone
      end: () => <UserMenu />,         // Override end zone
    },
    sidebar: {
      top: () => <Branding />,         // Override top zone
      content: () => <CustomNav />,    // Override content zone
      bottom: () => <UserProfile />,    // Override bottom zone
    },
    footer: () => <CustomFooter />,    // Replace entire footer (custom mode, no framework polish)
  }}
/>
```

**Hide zones:**
```tsx
layout={{
  header: {
    center: () => null,  // Hide center zone
  },
  footer: () => null,    // Hide footer
}}
```

**Available slots:** `header.start/center/end`, `sidebar.top/content/bottom`, `footer`, `mergedbar` (mobile nav).

---

## Advanced: Footer Mode

**Control footer scroll behavior:**

```tsx
// Default: footer scrolls with content on mobile, fixed on desktop
// No footerMode needed - this is the default for all built-in presets

// Fixed on all breakpoints (footer stays pinned at bottom, even on mobile):
footerMode: 'fixed',

// Scroll on all breakpoints (footer scrolls with content):
footerMode: 'scroll',
```

Set `footerMode` in your preset config or in the `layout` prop:
```tsx
<ViteAppProviders
  config={appConfig}
  layout={{ footerMode: 'fixed' }}
/>
```

---

## Advanced: CSS Variable Overrides

**Override dimensions in `src/themes.css`:**
```css
:root {
  --header-height: 96px;
  --sidebar-width: 320px;
  --main-max-width: 1480px;
  --footer-height: 64px;
  --section-gap: 2rem;
}
```

**Framework auto-computes:** Spacing, typography, responsive breakpoints.

---

## Advanced: Density System

**Global density:**
```tsx
layout={{
  density: 'compact', // compact | standard | expressive
}}
```

**Per-page density:**
```tsx
<PageContainer density="expressive">
  <HeroSection title="Hero" />
</PageContainer>
```

**Three densities:** `compact` (1.2x), `standard` (1.25x), `expressive` (1.333x).

---

## Advanced: Runtime Preset Changes

**Change preset programmatically:**
```tsx
import { useLayout } from '@donotdev/core';

const setLayoutPreset = useLayout('setLayoutPreset');
setLayoutPreset('plain');  // Switch to plain layout
```

**Pre-configured:** All presets handle auth, themes, languages automatically.

---

**Choose preset, get layout. Framework handles the rest.**
