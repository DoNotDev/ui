'use client';
// packages/ui/src/routing/NotFoundDocument.tsx

/**
 * @fileoverview Marks the 404 document
 * @description The framework's 404 pages (Next: the generated src/app/not-found and
 * src/app/global-not-found) wrap their providers in NotFoundDocument. The static 404
 * is rendered once at build (Next's internal path `/_not-found`) and served for every
 * unknown URL: output derived from the URL (canonical, og:url, JSON-LD, breadcrumbs)
 * would differ between the server HTML and the browser (React #418) and describe no
 * page. Components below read useIsNotFoundDocument() and omit it.
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

const NotFoundDocumentContext = createContext(false);

/**
 * Wraps the providers of a 404 document. Rendered by the framework's generated 404
 * pages; an app renders it only in a 404 page of its own.
 *
 * @example
 * ```tsx
 * <NotFoundDocument>
 *   <ClientLayout serverCookies="" acceptLanguage={null}>
 *     <NotFoundPage showRequestedPath={false} />
 *   </ClientLayout>
 * </NotFoundDocument>
 * ```
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */
export function NotFoundDocument({ children }: { children: ReactNode }) {
  return (
    <NotFoundDocumentContext.Provider value={true}>
      {children}
    </NotFoundDocumentContext.Provider>
  );
}

/**
 * Whether the render is inside a NotFoundDocument (the 404 document, served for
 * any unknown URL): URL-derived output must be omitted there.
 *
 * @returns `true` inside a NotFoundDocument
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */
export function useIsNotFoundDocument(): boolean {
  return useContext(NotFoundDocumentContext);
}
