# Layout System

Professional preset-based layout system for React applications with smart defaults.

## Overview

The layout system provides pre-built, professional layouts for different application types. Each preset is self-contained with its own components and styling, making it easy to switch between layouts or customize them.

## Presets

### Landing Layout (`landing`)

Marketing-focused layout with header and footer, optimized for conversion.

**Features:**

- Marketing header with CTA buttons and branding
- Full-width content area for marketing pages
- Rich footer with links and social media
- Responsive design with mobile-optimized header
- Smart defaults for all content

**CSS Variables:**

- `--header-height`: 96px (marketing header height)
- `--footer-height`: auto (content-based)
- `--main-padding`: 2rem (desktop) / 1rem (mobile)
- `--main-max-width`: none (full-width marketing content)

### Dashboard Layout (`admin`)

Professional dashboard layout with header, sidebar, and content area.

**Features:**

- Fixed header with branding and user controls
- Collapsible sidebar with navigation
- Main content area with proper spacing
- Responsive design with mobile optimization

**CSS Variables:**

- `--header-height`: 80px (desktop) / 60px (mobile)
- `--sidebar-width`: 280px (desktop) / 0px (mobile collapsed)
- `--footer-height`: 60px (desktop) / auto (mobile)
- `--main-padding`: 2rem (desktop) / 1rem (mobile)
- `--main-max-width`: 1480px (content-constrained)

### Documentation Layout (`docs`)

Documentation-focused layout (coming soon).

### App Layout (`moolti`)

App-like layout (coming soon).

## Usage

### Basic Usage (Smart Defaults)

```tsx
import { Layout } from '@donotdev/components';

function App() {
  return (
    <DnDevLayout layout="landing" app={{ name: 'My App' }}>
      <h1>Welcome to my app!</h1>
    </DnDevLayout>
  );
}
```

### With App Configuration

```tsx
import { Layout } from '@donotdev/components';

function App() {
  return (
    <DnDevLayout
      layout="landing"
      app={{
        name: 'My SaaS App',
        logo: '/my-logo.svg',
        description: 'The best tool for developers',
        links: {
          github: 'https://github.com/myapp',
          twitter: 'https://twitter.com/myapp',
          docs: '/docs',
        },
        footer: {
          showBuiltWith: false, // Hide "Built with DnDev"
          showSocial: true, // Show social links
          showLegal: true, // Show legal links
        },
      }}
    >
      <h1>Welcome to my app!</h1>
    </DnDevLayout>
  );
}
```

### With Layout Overrides

```tsx
import { Layout } from '@donotdev/components';

function App() {
  return (
    <DnDevLayout
      layout="landing"
      app={{ name: 'My App' }}
      layoutOverrides={{
        '--header-height': '120px',
        '--main-padding': '2rem',
      }}
    >
      <h1>Welcome to my app!</h1>
    </DnDevLayout>
  );
}
```

## App Configuration

The `app` prop accepts an `AppConfig` object with smart defaults:

```typescript
interface AppConfig {
  /** Application name */
  name?: string;

  /** Application logo path */
  logo?: string;

  /** Application description */
  description?: string;

  /** Social and external links */
  links?: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    support?: string;
    docs?: string;
    blog?: string;
  };

  /** Footer configuration */
  footer?: {
    showBuiltWith?: boolean; // Default: true
    showSocial?: boolean; // Default: true
    showLegal?: boolean; // Default: true
    showCompany?: boolean; // Default: true
    customLinks?: Array<{
      label: string;
      href: string;
    }>;
  };
}
```

### Smart Defaults

- **No config**: Shows default branding and "Built with DnDev"
- **Basic config**: Shows your name and logo
- **Full config**: Shows your links and custom footer options

### Examples

#### Zero Configuration

```tsx
<DnDevLayout layout="landing">
  <h1>My App</h1>
</DnDevLayout>
```

Shows: Default logo, "DoNotDev Framework", "Built with DnDev"

#### Minimal Configuration

```tsx
<DnDevLayout layout="landing" app={{ name: 'My App' }}>
  <h1>My App</h1>
</DnDevLayout>
```

Shows: "My App", "Built with DnDev"

#### Full Configuration

```tsx
<DnDevLayout
  layout="landing"
  app={{
    name: 'My SaaS',
    logo: '/logo.svg',
    description: 'The best tool ever',
    links: {
      github: 'https://github.com/mysaas',
      twitter: 'https://twitter.com/mysaas',
    },
    footer: {
      showBuiltWith: false,
    },
  }}
>
  <h1>My SaaS</h1>
</DnDevLayout>
```

Shows: Your logo, description, social links, no "Built with DnDev"
