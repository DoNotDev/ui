'use client';
// packages/ui/src/internal/initializers/BaseStoresInitializer.tsx

/**
 * @fileoverview Base stores initializer for framework state management
 * @description Initializes and coordinates all framework stores with proper error handling and readiness checks
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  useThemeStore,
  useNavigationStore,
  useOverlayStore,
  useNetworkStore,
  useAbortControllerStore,
  useConsentStore,
  useLanguageStore,
  useConsentReady,
  useThemeReady,
  getPlatformEnvVar,
} from '@donotdev/core';
import { initRipple } from '@donotdev/components';
import {
  useI18nReady,
  getI18nInstance,
  getSupportedLanguages,
} from '@donotdev/core';
import {
  handleError,
  isClient,
  getDndevConfig,
  globalEmitter,
} from '@donotdev/core';
import { useAppConfig } from '@donotdev/core';
import type { AppConfig, CustomStoreConfig } from '@donotdev/core';

import type { ReactNode } from 'react';

/**
 * Removes the shell loader instantly or with fade-out transition
 *
 * Called after content is painted and visible. Uses instant removal when
 * content is ready, fade-out as fallback. Idempotent - safe to call multiple times.
 *
 * @param options - Removal options
 * @param options.fade - Whether to use fade-out transition (default: false)
 */
function removeShellLoader(options?: { fade?: boolean }): void {
  try {
    const shellLoader = document.getElementById('shell-loader');
    if (!shellLoader) return;

    if (shellLoader.classList.contains('shell-loader--fading')) {
      return;
    }

    const removeElement = () => {
      try {
        shellLoader.remove();
      } catch (e) {
        try {
          shellLoader.parentNode?.removeChild(shellLoader);
        } catch (fallbackError) {
          shellLoader.style.display = 'none';
        }
      }
    };

    if (options?.fade) {
      shellLoader.classList.add('shell-loader--fading');

      shellLoader.addEventListener('transitionend', removeElement, {
        once: true,
      });

      setTimeout(removeElement, 350);
    } else {
      removeElement();
    }
  } catch (error) {
    const isDev = getPlatformEnvVar('DEV');
    if (isDev === 'true') {
      console.warn('[DoNotDev] Shell loader removal failed:', error);
    }
  }
}

const STORE_CONFIG = [
  { name: 'consent', type: 'critical', store: useConsentStore },
  { name: 'theme', type: 'critical', store: useThemeStore },
  { name: 'language', type: 'regular', store: useLanguageStore },
  { name: 'overlay', type: 'regular', store: useOverlayStore },
  { name: 'network', type: 'regular', store: useNetworkStore },
  { name: 'abort', type: 'regular', store: useAbortControllerStore },
  { name: 'routes', type: 'regular', store: useNavigationStore },
] as const;

/**
 * Store handlers interface
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface StoreHandlers {
  platform: string;
}

/**
 * Base stores initializer props interface
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export interface BaseStoresInitializerProps {
  children: ReactNode;
  handlers: StoreHandlers;
  customStores?: CustomStoreConfig[];
  skipStoreInit?: boolean;
  serverCookies?: string;
  /** Render children before stores are ready. Used by Next.js so SSR/SEO content is not blank. */
  renderBeforeReady?: boolean;
}

async function initializeStore(
  config: (typeof STORE_CONFIG)[number] | CustomStoreConfig,
  handlers: StoreHandlers,
  appConfig: AppConfig | null | undefined,
  serverCookies?: string
): Promise<boolean> {
  try {
    const dndevConfig = getDndevConfig();
    let success = false;

    if (config.name === 'theme') {
      const themeData = dndevConfig?.themes?.discovered || [];
      const themeStore = useThemeStore.getState();
      if (typeof themeStore.initialize === 'function') {
        const result = await themeStore.initialize({
          themes: themeData,
          appConfig,
        });
        success = result !== false;
      } else {
        success = true;
      }
    } else if (config.name === 'routes') {
      const routeData = dndevConfig?.routes?.mapping || [];
      const manifest = dndevConfig?.routes?.manifest || null;
      const navigationStore = useNavigationStore.getState();
      if (typeof navigationStore.initialize === 'function') {
        const result = await navigationStore.initialize({
          routes: routeData,
          manifest,
        });
        success = result !== false;
      } else {
        success = true;
      }
    } else if (config.name === 'language') {
      console.log('[BaseStoresInit] Initializing language store...');
      const languageStore = useLanguageStore.getState();
      if (typeof languageStore.initialize === 'function') {
        const i18n = getI18nInstance();
        const supportedLanguages = getSupportedLanguages();
        const fallbackLanguage = dndevConfig?.i18n?.fallback || 'en';
        const result = await languageStore.initialize({
          i18n,
          supportedLanguages,
          fallbackLanguage,
        });
        success = result !== false;
      } else {
        success = true;
      }
    } else if (config.name === 'consent') {
      const consentStore = useConsentStore.getState();
      if (typeof consentStore.initialize === 'function') {
        let cookieValue: string | null = null;

        // Extract cookie value (SSR or CSR)
        if (serverCookies) {
          // Next.js SSR: parse from serverCookies string
          const cookies = serverCookies.split(';');
          const consentCookie = cookies.find((c: string) =>
            c.trim().startsWith('dndev-cookie-consent=')
          );
          if (consentCookie) {
            const cookieParts = consentCookie.split('=');
            if (cookieParts.length > 1 && cookieParts[1]) {
              try {
                cookieValue = decodeURIComponent(cookieParts[1].trim());
              } catch {
                /* malformed cookie */
              }
            }
          }
        } else if (isClient()) {
          // CSR: read from document.cookie
          const cookies = document.cookie.split(';');
          const consentCookie = cookies.find((c: string) =>
            c.trim().startsWith('dndev-cookie-consent=')
          );
          if (consentCookie) {
            const cookieParts = consentCookie.split('=');
            if (cookieParts.length > 1 && cookieParts[1]) {
              try {
                cookieValue = decodeURIComponent(cookieParts[1].trim());
              } catch {
                /* malformed cookie */
              }
            }
          }
        }

        const result = await consentStore.initialize({
          cookieValue,
          appConfig,
        });
        success = result !== false;
      } else {
        success = true;
      }
    } else {
      const storeState = config.store.getState();
      if (typeof storeState.initialize === 'function') {
        const result = await storeState.initialize();
        success = result !== false;
      } else {
        success = true;
      }
    }

    if (!success) {
      throw new Error(`${config.name} initialization returned false`);
    }

    return true;
  } catch (error) {
    handleError(error, {
      userMessage: `${config.name} store initialization failed`,
      context: { platform: handlers.platform, store: config.name },
      severity: config.type === 'critical' ? 'error' : 'warning',
      log: true,
      reportToSentry: config.type === 'critical',
      showNotification: false,
    });
    return false;
  }
}

/**
 * BaseStoresInitializer - Initializes all framework stores
 *
 * Coordinates initialization of critical and regular stores with proper error handling.
 * Ensures stores are ready before rendering children. Handles SSR cookie hydration for Next.js.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function BaseStoresInitializer({
  children,
  handlers,
  customStores = [],
  skipStoreInit = false,
  serverCookies,
  renderBeforeReady = false,
}: BaseStoresInitializerProps) {
  const hasInitialized = useRef(false);
  const appConfig = useAppConfig();

  useEffect(() => {
    if (hasInitialized.current || skipStoreInit || !isClient()) return;

    const initializeStores = async () => {
      const allStores = [...STORE_CONFIG, ...customStores];

      const allStoresReady = allStores.every((config) => {
        const state = config.store.getState();
        return 'isReady' in state && state.isReady === true;
      });

      if (allStoresReady) return;

      hasInitialized.current = true;

      try {
        const criticalStores = allStores.filter(
          (config) => config.type === 'critical'
        );

        for (const config of criticalStores) {
          const success = await initializeStore(
            config,
            handlers,
            appConfig,
            serverCookies
          );
          if (!success && config.type === 'critical') {
            handleError(new Error(`Critical store ${config.name} failed`), {
              userMessage: `Critical store ${config.name} failed to initialize`,
              context: { platform: handlers.platform, store: config.name },
              severity: 'error',
              log: true,
              reportToSentry: true,
              showNotification: false,
            });
          }
        }

        const regularStores = allStores.filter(
          (config) => config.type === 'regular'
        );
        await Promise.allSettled(
          regularStores.map((config) =>
            initializeStore(config, handlers, appConfig, serverCookies)
          )
        );
      } catch (error) {
        handleError(error, {
          userMessage: 'Store initialization failed',
          context: { platform: handlers.platform },
          severity: 'error',
        });
      }
    };

    initializeStores();
  }, [skipStoreInit, handlers, appConfig, customStores]);

  const consentReady = useConsentReady();
  const themeReady = useThemeReady();
  const i18nReady = useI18nReady();

  const criticalCustomStores = customStores.filter(
    (config) => config.type === 'critical'
  );

  // Track custom store readiness via subscriptions — never call hooks inside .map()
  const [allCustomReady, setAllCustomReady] = useState(() => {
    if (criticalCustomStores.length === 0) return true;
    return criticalCustomStores.every((config) => {
      const state = config.store.getState();
      return 'isReady' in state && state.isReady === true;
    });
  });

  useEffect(() => {
    if (criticalCustomStores.length === 0) {
      setAllCustomReady(true);
      return;
    }

    const checkAll = () =>
      criticalCustomStores.every((config) => {
        const state = config.store.getState();
        return 'isReady' in state && state.isReady === true;
      });

    // Subscribe to each critical custom store for readiness updates
    const unsubscribers = criticalCustomStores.map((config) =>
      config.store.subscribe(() => {
        setAllCustomReady(checkAll());
      })
    );

    // Initial check in case stores became ready before subscriptions were set up
    setAllCustomReady(checkAll());

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
    // criticalCustomStores reference changes only when customStores prop changes
  }, [customStores]);

  const criticalReady =
    consentReady && themeReady && i18nReady && allCustomReady;

  // Two-phase loader: wait for BOTH framework AND route to be ready
  useLayoutEffect(() => {
    if (!isClient() || !criticalReady) return;

    // Initialize ripple effect for all .dndev-interactive elements
    initRipple();

    let removed = false;
    let frameworkReady = false;
    let routeReady = false;

    const removeLoader = () => {
      if (removed) return;
      removed = true;
      removeShellLoader({ fade: true }); // Always fade

      // Focus main so PageUp/PageDown works (CSR/SSR safe)
      if (isClient()) {
        requestAnimationFrame(() => {
          const main = document.querySelector('main');
          if (main) {
            main.setAttribute('tabindex', '-1'); // Focusable but not in tab order
            main.focus();
          }
        });
      }
    };

    const checkBothReady = () => {
      if (!frameworkReady || !routeReady || removed) return;
      removeLoader();
    };

    const handleFrameworkReady = () => {
      frameworkReady = true;
      checkBothReady();
    };

    const handleRouteReady = () => {
      routeReady = true;
      checkBothReady();
    };

    const unsubFramework = globalEmitter.on(
      'DNDEV_FRAMEWORK_READY',
      handleFrameworkReady
    );
    const unsubRoute = globalEmitter.on('DNDEV_ROUTE_READY', handleRouteReady);

    // Fallback timeout: if route doesn't signal within 2s, remove anyway
    const fallbackTimeout = setTimeout(() => {
      if (!removed) {
        removeLoader();
      }
    }, 2000);

    return () => {
      unsubFramework();
      unsubRoute();
      clearTimeout(fallbackTimeout);
    };
  }, [criticalReady]);

  if (!criticalReady && !renderBeforeReady) return null;

  return <>{children}</>;
}
