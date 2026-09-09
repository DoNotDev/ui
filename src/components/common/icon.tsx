// packages/ui/src/components/common/icon.tsx

/**
 * @fileoverview Icon component for UI package
 * @description Unified icon rendering for Lucide icons, emojis, and custom ReactNode content
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { isValidElement } from 'react';
import type { ComponentType, ReactNode } from 'react';

import { cn } from '@donotdev/components';

function getLucideIcon(name: string | undefined): ComponentType<LucideProps> {
  if (!name) return LucideIcons.Palette;
  const cleanIconName = name.replace(/['"]/g, '');
  return (LucideIcons as any)[cleanIconName] || LucideIcons.Palette;
}

/** Props for the Icon component. */
export interface IconProps {
  /**
   * Icon - Flexible runtime icon component
   *
   * **SUPPORTS ALL FORMATS:**
   * - ✅ Lucide components: `<Rocket />` (function)
   * - ✅ Emoji strings: `"🚀"`
   * - ✅ Lucide icon name strings: `"Rocket"` (resolved from lucide-react)
   * - ✅ Custom ReactNode: Any custom component or element
   *
   * **NOTE:** This is the flexible runtime Icon component. For PageMeta.icon, only lucide-react JSX components are supported (see PageMeta type).
   */
  icon?: ComponentType<LucideProps> | string | ReactNode;
  /** Fallback icon when icon prop is missing (same type as icon) */
  fallback?: ComponentType<LucideProps> | string | ReactNode;
  className?: string;
  ariaHidden?: boolean;
}

/**
 * Icon - Unified icon component (FLEXIBLE RUNTIME COMPONENT)
 *
 * **This is the flexible runtime component** - supports Lucide components, emojis, strings, and custom ReactNode.
 *
 * **For PageMeta.icon:** Only lucide-react JSX components are supported (extracted at build time).
 * **For Icon component:** All formats are supported (resolved at runtime).
 *
 * @example
 * ```tsx
 * // Runtime usage - all formats work
 * <Icon icon="🚀" /> // Emoji
 * <Icon icon="Rocket" /> // Lucide name string
 * <Icon icon={<Rocket />} /> // Lucide component
 * <Icon icon={<CustomIcon />} /> // Custom component
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const Icon: ComponentType<IconProps> = ({
  icon,
  fallback,
  className,
  ariaHidden = false,
}) => {
  const iconToRender = icon || fallback;
  if (!iconToRender) return null;

  const sizeClass = 'dndev-size-md';

  if (
    typeof iconToRender === 'function' ||
    (typeof iconToRender === 'object' &&
      iconToRender !== null &&
      'render' in iconToRender)
  ) {
    const IconComponent = iconToRender as ComponentType<LucideProps>;
    return (
      <IconComponent
        className={cn(sizeClass, className)}
        style={{ flexShrink: 0 }}
        aria-hidden={ariaHidden}
      />
    );
  }

  if (typeof iconToRender === 'string') {
    // Check if string is an emoji (not a valid identifier)
    // Valid identifiers: alphanumeric, underscore, hyphen (Lucide icon names)
    // Emojis: anything else (Unicode symbols, emojis, etc.)
    const isValidIdentifier = /^[a-zA-Z0-9_-]+$/.test(iconToRender);
    const isEmoji = !isValidIdentifier;

    if (isEmoji) {
      return (
        <span
          className={cn(sizeClass, className)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden={ariaHidden}
        >
          {iconToRender}
        </span>
      );
    }

    const LucideIcon = getLucideIcon(iconToRender);
    return (
      <LucideIcon
        className={cn(sizeClass, className)}
        style={{ flexShrink: 0 }}
        aria-hidden={ariaHidden}
      />
    );
  }

  if (isValidElement(iconToRender)) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden={ariaHidden}
      >
        {iconToRender}
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden={ariaHidden}
    >
      {iconToRender}
    </span>
  );
};

export default Icon;
export { Icon };
