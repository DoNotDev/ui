'use client';
// packages/ui/src/routing/hooks/index.ts

/**
 * @fileoverview Routing hooks barrel - DO NOT IMPORT DIRECTLY
 * @description This file exists for backwards compatibility and local development.
 *
 * IMPORTANT: Components should import from '@donotdev/ui' (main entry point).
 * The routing/index.ts re-exports from '@donotdev/ui/routing/hooks' which triggers
 * conditional exports to resolve the correct platform implementation.
 *
 * This file uses direct relative imports as a fallback for:
 * - TypeScript type checking during development
 * - Direct file resolution in non-bundled contexts
 *
 * When bundled properly:
 * - Vite: resolve.conditions ['vite-app'] → hooks.vite.ts (React Router)
 * - Next.js: default → hooks.next.ts (App Router)
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

// For direct imports and TypeScript, re-export from the Next.js implementation
// (this file should rarely be imported directly - use @donotdev/ui instead)
// The bundler-resolved subpath export in routing/index.ts handles actual resolution
export * from './hooks.next';
