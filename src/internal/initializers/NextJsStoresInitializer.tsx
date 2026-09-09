'use client';
// packages/ui/src/internal/initializers/NextJsStoresInitializer.tsx

/**
 * @fileoverview Next.js stores initializer
 * @description Next.js-specific store initialization with SSR cookie hydration
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { isTest, isClient, getDndevConfig } from '@donotdev/core';
import { useThemeStore } from '@donotdev/core';
import type { CustomStoreConfig } from '@donotdev/core';

import {
  BaseStoresInitializer,
  type StoreHandlers,
} from './BaseStoresInitializer';

interface NextJsStoresInitializerProps {
  children: ReactNode;
  serverCookies?: string;
  customStores?: CustomStoreConfig[];
  skipStoreInit?: boolean;
}

function createNextJsHandlers(): StoreHandlers {
  return {
    platform: 'Next.js',
  };
}

/**
 * NextJsStoresInitializer - Next.js platform store initializer
 *
 * Wraps BaseStoresInitializer with Next.js-specific handlers and SSR cookie hydration.
 * Hydrates theme store from cookies before render to prevent FOUC (Flash of Unstyled Content).
 * Automatically skips initialization in test environments.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function NextJsStoresInitializer({
  children,
  serverCookies,
  customStores,
  skipStoreInit,
}: NextJsStoresInitializerProps) {
  const skip = skipStoreInit ?? isTest();
  const handlers = createNextJsHandlers();

  // Next.js SSR: Hydrate theme store from cookies before render
  // Flow: 1) Next.js layout reads cookie and applies theme class (SSR)
  // 2) This component hydrates Zustand store with theme from cookie (client-side only)
  // 3) Client hydrates → Zustand persist restores from localStorage (should match cookie)
  // 4) setAvailableThemes() applies theme to DOM once themes are loaded (client)
  // This ensures server-rendered HTML matches client-rendered content (no FOUC).
  useEffect(() => {
    if (skip || !isClient() || !serverCookies) return;

    const themeData = getDndevConfig()?.themes?.discovered || [];

    const cookies = serverCookies.split(';');
    const themeCookie = cookies.find((c: string) =>
      c.trim().startsWith('dndev-theme=')
    );

    if (themeCookie) {
      try {
        const cookieValue = themeCookie.split('=')[1]?.trim();
        if (cookieValue) {
          let theme: string;
          try {
            theme = decodeURIComponent(cookieValue);
          } catch {
            // Malformed URI encoding in cookie value — skip hydration
            return;
          }
          // Validate theme exists in available themes (build-time config is available synchronously)
          if (themeData.some((t: any) => t.name === theme)) {
            useThemeStore.setState({ currentTheme: theme });
          }
        }
      } catch (e) {
        // Ignore cookie parse errors
      }
    }
  }, [skip, serverCookies]);

  return (
    <BaseStoresInitializer
      handlers={handlers}
      customStores={customStores}
      skipStoreInit={skip}
      serverCookies={serverCookies}
      renderBeforeReady
    >
      {children}
    </BaseStoresInitializer>
  );
}
