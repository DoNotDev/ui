// packages/ui/src/components/common/lucideIconByName.ts

/**
 * @fileoverview Runtime Lucide icon lookup by export name
 * @description Typed replacement for `(LucideIcons as any)[name]`. Internal to @donotdev/ui (not re-exported).
 *
 * @version 0.1.0
 * @since 0.2.2
 * @author AMBROISE PARK Consulting
 */

import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** The lucide-react namespace viewed as a name-indexed lookup table. */
const LUCIDE_EXPORTS: Readonly<Record<string, unknown>> = LucideIcons;

/**
 * Narrows a lucide-react export to an icon component (function or forwardRef object).
 *
 * @param value - Any lucide-react export
 * @returns True when the export is renderable as an icon component
 */
function isLucideIcon(value: unknown): value is LucideIcon {
  return (
    typeof value === 'function' ||
    (typeof value === 'object' && value !== null && 'render' in value)
  );
}

/**
 * Finds a Lucide icon component by its export name (e.g. `"Rocket"`).
 *
 * @param name - Lucide export name
 * @returns The icon component, or undefined when no icon export has that name
 */
export function findLucideIcon(name: string): LucideIcon | undefined {
  const candidate = LUCIDE_EXPORTS[name];
  return isLucideIcon(candidate) ? candidate : undefined;
}
