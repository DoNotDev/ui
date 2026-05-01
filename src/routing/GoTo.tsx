// packages/ui/src/routing/GoTo.tsx

/**
 * @fileoverview GoTo component
 * @description Navigation command palette button
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Search } from 'lucide-react';

import { Button, BUTTON_VARIANT, DISPLAY } from '@donotdev/components';
import { useOverlayStore, useTranslation } from '@donotdev/core';

/** Props for the GoTo command palette trigger. */
export interface GoToProps {
  /**
   * Display - controls button presentation
   * @default 'auto'
   */
  display?: (typeof DISPLAY)[keyof typeof DISPLAY];
  /** Additional CSS class */
  className?: string;
  /** Optional callback called after opening command dialog (e.g., to close parent dropdown) */
  onOpen?: () => void;
}

/**
 * GoTo - Command palette trigger button
 *
 * Simple button: Search icon + "Go to" label + keyboard shortcut.
 * Opens command dialog on click.
 */
export const GoTo = ({
  display = DISPLAY.AUTO,
  className,
  onOpen,
}: GoToProps) => {
  const { t } = useTranslation('dndev');
  const openCommandDialog = useOverlayStore((state) => state.openCommandDialog);

  // Platform-aware shortcut (Mac: ⌘K, others: Ctrl+K)
  // navigator.userAgentData?.platform is modern; navigator.platform is the deprecated fallback
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(
      (navigator as Navigator & { userAgentData?: { platform?: string } })
        .userAgentData?.platform ?? navigator.platform
    );
  const shortcut = isMac ? '⌘K' : 'Ctrl+K';

  const handleClick = () => {
    openCommandDialog();
    onOpen?.(); // Call optional callback (e.g., to close parent dropdown)
  };

  return (
    <Button
      variant={BUTTON_VARIANT.OUTLINE}
      display={display}
      icon={Search}
      onClick={handleClick}
      className={className}
      aria-label={t('goTo.ariaLabel', 'Go to page')}
    >
      {t('goTo.label', 'Go to')}
      <kbd
        style={{
          marginInlineStart: 'var(--gap-sm)',
          padding: '0.125rem 0.375rem',
          fontSize: 'var(--font-size-xs)',
          fontFamily: 'var(--font-mono)',
          opacity: 0.5,
        }}
      >
        {shortcut}
      </kbd>
    </Button>
  );
};

export default GoTo;
