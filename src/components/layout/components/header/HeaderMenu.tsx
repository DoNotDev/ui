// packages/ui/src/components/layout/components/header/HeaderMenu.tsx

/**
 * @fileoverview HeaderMenu component
 * @description Dropdown menu for header controls with responsive grid layout
 *
 * Features:
 * - DropdownMenu with responsive grid layout
 * - Adapts to any number of buttons
 * - Reusable across all layout presets
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, BUTTON_VARIANT, DropdownMenu } from '@donotdev/components';

/** Props for the HeaderMenu component. */
export interface HeaderMenuProps {
  /** Content to display (buttons, controls, etc.) */
  children: ReactNode;
  /** Additional CSS classes for trigger button */
  className?: string;
}

/**
 * HeaderMenu - Dropdown menu component for header controls
 *
 * Displays content in a dropdown menu with responsive grid layout.
 * Layout presets decide when to use this component based on breakpoint.
 *
 * Labels are forced visible via CSS (.dndev-menu-content forces labels visible).
 * No cloneElement needed - pure CSS solution.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 *
 * @example
 * ```tsx
 * // In layout preset:
 * const isMobileOrTablet = useBreakpoint('isMobileOrTablet');
 * {isMobileOrTablet ? (
 * <HeaderMenu>
 * <AuthHeader />
 * <LanguageSelector />
 * <ThemeToggle />
 * </HeaderMenu>
 * ) : (
 * <>{rightContent}</>
 * )}
 * ```
 */
export const HeaderMenu = ({ children, className }: HeaderMenuProps) => (
  <DropdownMenu
    trigger={
      <Button
        variant={BUTTON_VARIANT.GHOST}
        icon={MoreHorizontal}
        aria-label="Menu"
        className={className}
      />
    }
    contentAlign="end"
  >
    {children}
  </DropdownMenu>
);

export default HeaderMenu;
