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

import { useEffect, useRef, useState } from 'react';
import type { ReactNode, ReactElement, ComponentProps } from 'react';

import {
  ComponentLocaleProvider,
  Dialog,
  LinkRendererProvider,
  Toaster,
  TooltipProvider,
} from '@donotdev/components';
import type { ComponentLocale, LinkRendererProps } from '@donotdev/components';
import {
  getAppTimeZone,
  getRoutes,
  useOverlayStore,
  useTranslation,
} from '@donotdev/core';
import type { FormNavigation } from '@donotdev/crud';
// Platform-specific hooks via conditional exports
import { useNavigate, useRoutePath } from '@donotdev/ui/routing/hooks';

import { FormNavigationProvider, isCrudModuleAvailable } from '../../crud/crudImports';
import { Link } from '../../routing/Link';
import { getParentRoutePath } from '../../routing/parentRoute';

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

/**
 * Fills crud's form navigation placeholder with the app router, so
 * `useEntityForm` can leave for the previous breadcrumb on save.
 * Functions read the latest route at call time; the context value never
 * changes, so forms do not re-render on navigation because of it.
 */
function FormNavigationBridge({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRoutePath();
  const latest = useRef({ navigate, pathname });
  useEffect(() => {
    latest.current = { navigate, pathname };
  });
  const [value] = useState<FormNavigation>(() => ({
    navigate: (path) => {
      void latest.current.navigate(path);
    },
    currentPath: () => latest.current.pathname,
    // The page's nearest ancestor (the Breadcrumbs chain, over the route manifest)
    parentPath: () => getParentRoutePath(latest.current.pathname, getRoutes()),
  }));
  return <FormNavigationProvider value={value}>{children}</FormNavigationProvider>;
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
  // Components' built-in labels and formatting: the i18n language and the eager `dndev`
  // namespace, both the request language on the server render and the hydration pass;
  // the app's time zone (i18n.timeZone: throws when the generated i18n config is not loaded)
  const { t, language } = useTranslation('dndev');
  const locale: ComponentLocale = {
    language,
    timeZone: getAppTimeZone(),
    translate: (key, values) => String(t(key, values)),
  };
  return (
    <DnDevErrorBoundary level="app" fallback={UIGlobalErrorFallback}>
      <LinkRendererProvider value={RouterLinkRenderer}>
        <ComponentLocaleProvider value={locale}>
          <TooltipProvider>
            {/* Module-level constant: crud is installed or not for the app's lifetime. */}
            {isCrudModuleAvailable ? (
              <FormNavigationBridge>{children}</FormNavigationBridge>
            ) : (
              children
            )}
            <Toaster />
            <ModalDialog />
          </TooltipProvider>
        </ComponentLocaleProvider>
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
