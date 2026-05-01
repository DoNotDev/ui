// packages/ui/src/routing/GoToInput.tsx

/**
 * @fileoverview GoToInput - Typeable navigation input
 * @description Real input that opens command dialog with current search value
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Search } from 'lucide-react';
import { useEffect, useState, useRef, type KeyboardEvent } from 'react';

import { Stack } from '@donotdev/components';
import { useOverlayStore } from '@donotdev/core';
import { useTranslation } from '@donotdev/core';

/**
 * Navigation input - typeable search that syncs with command dialog
 */
/** Detect macOS/iOS for keyboard shortcut label (defaults to ⌘K during SSR) */
const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.userAgent);

const GoToInput = () => {
  const { t } = useTranslation('dndev');
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isCommandDialogOpen = useOverlayStore(
    (state) => state.isCommandDialogOpen
  );

  // Clear input when dialog closes
  useEffect(() => {
    if (!isCommandDialogOpen) {
      setValue('');
    }
  }, [isCommandDialogOpen]);

  const handleFocus = () => {
    useOverlayStore.getState().openCommandDialog(value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      useOverlayStore.getState().openCommandDialog(value);
    }
  };

  return (
    <Stack
      direction="row"
      align="center"
      className="dndev-relative dndev-w-full dndev-max-w-sm"
      role="search"
    >
      <Search
        className="dndev-absolute dndev-size-md"
        style={{ insetInlineStart: '0.75rem', opacity: 0.5 }}
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={t('globalGoTo.searchPlaceholder', 'Search pages...')}
        className="dndev-input dndev-w-full"
        style={{ paddingInlineStart: '2.5rem', paddingInlineEnd: '5rem' }}
        aria-label={t('globalGoTo.ariaLabel', 'Search navigation')}
      />
      <div
        className="dndev-absolute dndev-flex dndev-items-center dndev-text-sm"
        style={{ insetInlineEnd: '0.75rem', gap: '0.25rem', opacity: 0.5 }}
        aria-hidden="true"
      >
        <kbd
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: 'var(--font-size-xs)',
            fontFamily: 'var(--font-mono)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {isMac ? '⌘K' : 'Ctrl+K'}
        </kbd>
      </div>
    </Stack>
  );
};

export default GoToInput;
