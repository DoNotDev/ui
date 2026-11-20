// packages/ui/src/rsc.ts

/**
 * @fileoverview UI package, React Server Components entry
 * @description `@donotdev/ui/rsc`: resolves only under the `react-server` export
 * condition (Next's RSC graph); anywhere else the import fails to resolve. Nothing
 * imports it yet: `@donotdev/ui` itself stays `index.ts` everywhere. Its modules
 * import `@donotdev/components` (the client barrel), so components they render are
 * client references.
 *
 * Same exports as `index.ts`, without its `'use client'`: presentational modules
 * (PageContainer…) load as server components, and every interactive module keeps its
 * own per-file `'use client'`, so a server component that renders it gets a client
 * reference (an island). Values exported by a `'use client'` module (hooks, providers,
 * helpers) are client references here: calling them on the server throws, which is
 * the intended fail-loud.
 *
 * Keep in sync with `index.ts` (the entries test compares both export lists).
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */

export * from './components';
export * from './crud';
export * from './data/techLogos';
export * from './routing';
export * from './styles';
export * from './utils';
