'use client';
// packages/ui/src/components/common/iconByName.tsx

/**
 * @fileoverview Lucide icon component from an icon name string
 * @description Resolves `"Sun"` / `"Rocket"` to a renderable icon component without the
 * lucide-react namespace (which would put all ~1,600 icons in every bundle):
 * 1. Theme icons (`--theme-icon` in the app's CSS) come from the build-time registry
 *    `_DNDEV_CONFIG_.themes.icons` (named imports in the generated theme module): static,
 *    server-rendered.
 * 2. Any other name is loaded per icon (`DynamicIcon`, one async chunk per icon), with a
 *    same-size placeholder until it arrives.
 * Internal to @donotdev/ui (not re-exported).
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */

import type { LucideProps } from 'lucide-react';
import { lazy, Suspense } from 'react';
import type { ComponentType, ReactElement } from 'react';

import { getDndevConfig } from '@donotdev/core';

import { IconPlaceholder } from './IconPlaceholder';

/** A renderable Lucide-style icon component. */
export type NamedIconComponent = ComponentType<LucideProps>;

const LazyLucideIcon = lazy(() => import('./LazyLucideIcon'));

/** Lazy icon components per fallback, then per name: one stable component per name. */
const lazyIcons = new Map<NamedIconComponent, Map<string, NamedIconComponent>>();

/**
 * Lazy icon component for a name (created once, so React never remounts it).
 *
 * @param name - Lucide export name
 * @param fallback - Icon shown when lucide has no icon of that name
 * @returns Stable icon component
 */
function lazyIcon(
  name: string,
  fallback: NamedIconComponent
): NamedIconComponent {
  let byName = lazyIcons.get(fallback);
  if (!byName) {
    byName = new Map();
    lazyIcons.set(fallback, byName);
  }
  const cached = byName.get(name);
  if (cached) return cached;

  function NamedIcon(props: LucideProps): ReactElement {
    return (
      <Suspense
        fallback={
          <IconPlaceholder className={props.className} style={props.style} />
        }
      >
        <LazyLucideIcon name={name} fallback={fallback} {...props} />
      </Suspense>
    );
  }
  NamedIcon.displayName = `NamedIcon(${name})`;
  byName.set(name, NamedIcon);
  return NamedIcon;
}

/**
 * Icon component for a Lucide icon name (`"Sun"`, `"SunIcon"`, `"LucideSun"`; quotes from
 * a CSS value are ignored).
 *
 * @param name - Lucide export name
 * @param fallback - Icon shown when lucide has no icon of that name
 * @returns The registered theme icon, else a lazily loaded icon
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */
export function iconByName(
  name: string,
  fallback: NamedIconComponent
): NamedIconComponent {
  const cleanName = name.replace(/['"]/g, '');
  const registered = getDndevConfig()?.themes?.icons?.[cleanName];
  if (registered) return registered;
  return lazyIcon(cleanName, fallback);
}
