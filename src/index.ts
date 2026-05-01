'use client';
// packages/ui/src/index.ts

/**
 * @fileoverview UI package
 * @description Universal/shared UI exports (CSR/SSR safe)
 *
 * Platform-specific code available via subpath imports:
 * - @donotdev/ui/next → NextJsAppProviders, NextJsStoresInitializer
 * - @donotdev/ui/vite → ViteAppProviders, ViteStoresInitializer, AppRoutes, RootLayout
 *
 * All UI components must be Client Components in Next.js
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

export * from './components';
export * from './crud';
export * from './data/techLogos';
export * from './routing';
export * from './styles';
export * from './utils';

// Game preset helpers - use via useLayout hook from @donotdev/core:
// const setGameTitle = useLayout('setGameTitle');
// setGameTitle('My Title');
