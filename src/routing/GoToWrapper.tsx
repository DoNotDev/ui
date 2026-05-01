// packages/ui/src/routing/GoToWrapper.tsx

/**
 * @fileoverview GoToWrapper Component
 * @description Navigation command palette wrapper with Cmd+K listener
 *
 * Features:
 * - Cmd+K keyboard shortcut for quick access
 * - Lazy-loaded dialog for optimal performance
 * - CSR/SSR safe with graceful fallbacks
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Suspense, lazy } from 'react';

import { useEventListener, useOverlayStore } from '@donotdev/core';

// Lazy load the dialog
const GoToDialog = lazy(() => import('./GoToDialog'));

/**
 * GoToWrapper - Keyboard listener + lazy dialog
 *
 * Performance:
 * - Zero code loaded until dialog opens
 * - Cmd+K listener always active
 * - Dialog lazy-loaded on first open
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const GoToWrapper = () => {
  const openCommandDialog = useOverlayStore((state) => state.openCommandDialog);

  // Cmd+K keyboard shortcut
  useEventListener<KeyboardEvent, Document>(
    'keydown',
    (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        // Don't intercept Cmd+K in form fields where it may have native meaning
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
        event.preventDefault();
        openCommandDialog();
      }
    },
    {
      target: document,
      options: {
        passive: false,
        capture: false,
      },
    }
  );

  return (
    <Suspense fallback={null}>
      <GoToDialog />
    </Suspense>
  );
};

export default GoToWrapper;
