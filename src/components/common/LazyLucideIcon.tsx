'use client';
// packages/ui/src/components/common/LazyLucideIcon.tsx

/**
 * @fileoverview Lucide icon loaded by name
 * @description Renders a Lucide icon from its export name (`"Rocket"`) through `DynamicIcon`
 * (`lucide-react/dynamic`): each icon is its own async chunk, loaded on first render. This
 * module is itself loaded lazily by `iconByName`, so the name table stays out of the
 * initial bundle. Internal to @donotdev/ui (not re-exported).
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */

import type { LucideProps } from 'lucide-react';
import { DynamicIcon, iconNames } from 'lucide-react/dynamic';
import type { IconName } from 'lucide-react/dynamic';
import { useCallback } from 'react';
import type { ComponentType, ReactElement } from 'react';

import { IconPlaceholder } from './IconPlaceholder';

/**
 * Export name of a dynamic icon name: `arrow-down-0-1` → `ArrowDown01` (lucide's own rule).
 *
 * @param iconName - Kebab-case dynamic icon name
 * @returns PascalCase export name
 */
function toExportName(iconName: string): string {
  return iconName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Export name (aliases included) → dynamic icon name. */
const DYNAMIC_NAME_BY_EXPORT: ReadonlyMap<string, IconName> = new Map(
  iconNames.map((iconName) => [toExportName(iconName), iconName])
);

/**
 * Dynamic icon name of a lucide-react export name. Accepts the export's three spellings:
 * `Sun`, `SunIcon`, `LucideSun`.
 *
 * @param name - Lucide export name
 * @returns The dynamic icon name, or undefined when lucide has no such icon
 */
export function toDynamicIconName(name: string): IconName | undefined {
  return (
    DYNAMIC_NAME_BY_EXPORT.get(name) ??
    DYNAMIC_NAME_BY_EXPORT.get(name.replace(/^Lucide/, '').replace(/Icon$/, ''))
  );
}

/** Props of {@link LazyLucideIcon}. */
export interface LazyLucideIconProps extends LucideProps {
  /** Lucide export name (`"Rocket"`) */
  name: string;
  /** Icon rendered when lucide has no icon of that name */
  fallback: ComponentType<LucideProps>;
}

/**
 * Lucide icon by export name, fetched as its own chunk. Renders a same-size placeholder
 * while the chunk loads (and on the server: no layout shift on hydration).
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */
export default function LazyLucideIcon({
  name,
  fallback: Fallback,
  ...props
}: LazyLucideIconProps): ReactElement {
  const { className, style } = props;
  const Loading = useCallback(
    () => <IconPlaceholder className={className} style={style} />,
    [className, style]
  );

  const dynamicName = toDynamicIconName(name);
  if (!dynamicName) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Icon] "${name}" is not a Lucide icon name.`);
    }
    return <Fallback {...props} />;
  }
  return <DynamicIcon name={dynamicName} fallback={Loading} {...props} />;
}
