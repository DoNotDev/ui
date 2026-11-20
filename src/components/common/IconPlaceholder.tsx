// packages/ui/src/components/common/IconPlaceholder.tsx

/**
 * @fileoverview Icon placeholder
 * @description Empty box with the icon's class and style, shown while a lazy icon loads.
 * Internal to @donotdev/ui (not re-exported).
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */

import type { CSSProperties, ReactElement } from 'react';

/** Props of {@link IconPlaceholder}: the sizing props of the icon it stands for. */
export interface IconPlaceholderProps {
  className?: string;
  style?: CSSProperties;
}

/**
 * Same-size stand-in for an icon that is not loaded yet (decorative).
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */
export function IconPlaceholder({
  className,
  style,
}: IconPlaceholderProps): ReactElement {
  return (
    <span
      className={className}
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
      aria-hidden="true"
    />
  );
}
