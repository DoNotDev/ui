'use client';
// packages/ui/src/internal/providers/UIProviders.tsx

/**
 * @fileoverview UIProviders component
 * @description Provides wrapper to basic UI components
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { ReactNode, ReactElement, ComponentProps } from 'react';

import {
  Dialog,
  LinkRendererProvider,
  Toaster,
  TooltipProvider,
} from '@donotdev/components';
import type { LinkRendererProps } from '@donotdev/components';
import { useOverlayStore } from '@donotdev/core';

import { Link } from '../../routing/Link';

import DnDevErrorBoundary from '../common/DnDevErrorBoundary';
import GlobalErrorFallback from '../common/GlobalErrorFallback';

/** Router link for components' `href` props (Card): Next Link or react-router Link. */
function RouterLinkRenderer({ href, ...rest }: LinkRendererProps) {
  return <Link path={href} {...rest} />;
}

function UIGlobalErrorFallback(
  props: ComponentProps<typeof GlobalErrorFallback>
) {
  return <GlobalErrorFallback {...props} />;
}

interface UIProvidersProps {
  children: ReactNode;
}

/**
 * Provides a wrapper to basic UI components
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function UIProviders({ children }: UIProvidersProps): ReactElement {
  return (
    <DnDevErrorBoundary level="app" fallback={UIGlobalErrorFallback}>
      <LinkRendererProvider value={RouterLinkRenderer}>
        <TooltipProvider>
          {children}
          <Toaster />
          <ModalDialog />
        </TooltipProvider>
      </LinkRendererProvider>
    </DnDevErrorBoundary>
  );
}

/**
 * ModalDialog - Renders modal dialog using store directly
 * Moved from ModalContext to avoid redundant context wrapper
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
function ModalDialog() {
  const isOpen = useOverlayStore((state) => state.isOpen);
  const content = useOverlayStore((state) => state.content);
  const closeModal = useOverlayStore((state) => state.closeModal);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      {content}
    </Dialog>
  );
}
