'use client';
// packages/ui/src/components/layout/components/header/HeaderMenu.tsx

/**
 * @fileoverview HeaderMenu component
 * @description Header controls inline on laptop and desktop, behind a hamburger below
 *
 * Features:
 * - Children inline from the laptop breakpoint up, in a burger panel below
 * - CSS-only switch (HeaderMenu.css): both are in the server HTML, no hydration swap
 * - Nested popups (DropdownMenu, Dialog…) open and work from inside the panel
 * - Reusable across all layout presets
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Menu } from 'lucide-react';
import { useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';

import { Button, BUTTON_VARIANT, Popover, Stack } from '@donotdev/components';

/** Props for the HeaderMenu component. */
export interface HeaderMenuProps {
  /** Header controls: inline from laptop up, in the burger panel below */
  children: ReactNode;
  /** Additional CSS classes for trigger button */
  className?: string;
}

/**
 * Whether a click inside the burger panel ends the interaction.
 *
 * The panel renders its own copy of the children, so closing it unmounts any popup
 * they opened. It stays open for a popup trigger (`aria-expanded`: DropdownMenu,
 * Dialog, Popover, Select triggers) and for clicks inside a nested dialog, which is
 * portaled outside the panel. Any other click (a plain control, a nested menu choice)
 * closes it, as a menu item does.
 */
function endsInteraction({
  target,
  currentTarget,
}: MouseEvent<HTMLElement>): boolean {
  if (!(target instanceof Element) || target.closest('[aria-expanded]')) {
    return false;
  }
  if (currentTarget.contains(target)) return true;
  return !target.closest('[role="dialog"], [role="alertdialog"]');
}

/**
 * HeaderMenu - Header controls that collapse into a hamburger
 *
 * Renders `children` inline (`display: contents`, so they sit in the parent row with
 * its gap) and a hamburger whose panel renders the same children while open. Both are
 * in the server HTML; HeaderMenu.css shows the hamburger below the laptop breakpoint
 * (1024px, the split of `useBreakpoint('isMobileOrTablet')`) and the inline controls
 * from it up. No JS breakpoint, no hydration swap: usable at every width.
 *
 * The panel is a Popover, not a DropdownMenu: menu items swallow the clicks of the
 * controls inside them and keep keyboard focus on the item wrapper, which broke
 * nested popups (AuthHeader's provider menu or dialog, LanguageSelector, an account
 * DropdownMenu). Labels are forced visible in the panel (.dndev-menu-content).
 * The panel sits just above the header, so dialogs and menus opened from it show above it.
 *
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 *
 * @example
 * ```tsx
 * // Inline on laptop and desktop, burger on mobile and tablet:
 * <HeaderMenu>
 *   <AuthHeader />
 *   <LanguageSelector />
 *   <ThemeToggle />
 * </HeaderMenu>
 * ```
 */
export const HeaderMenu = ({ children, className }: HeaderMenuProps) => {
  const [open, setOpen] = useState(false);

  const closeAfterAction = (event: MouseEvent<HTMLElement>) => {
    if (endsInteraction(event)) setOpen(false);
  };

  return (
    <>
      <div className="dndev-header-menu-inline">{children}</div>
      <div className="dndev-header-menu-burger">
        <Popover
          open={open}
          onOpenChange={setOpen}
          align="end"
          className="dndev-menu-content dndev-header-menu-panel"
          trigger={
            <Button
              variant={BUTTON_VARIANT.GHOST}
              icon={Menu}
              aria-label="Menu"
              className={className}
            />
          }
        >
          <Stack gap="none" onClick={closeAfterAction}>
            {children}
          </Stack>
        </Popover>
      </div>
    </>
  );
};

export default HeaderMenu;
