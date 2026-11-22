// packages/ui/src/internal/layout/components/trailingSlash.ts

/**
 * @fileoverview The app's trailing-slash URL form at runtime
 * @description Read by the SEO head (AutoMetaTags) to build public URLs in the
 * form the app serves (`formatTrailingSlash`, `languageUrl` in @donotdev/core).
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */

import { getDndevConfig } from '@donotdev/core';

/**
 * Whether the app's page URLs end with `/`: the Next `trailingSlash` setting, written by
 * the build into the route manifest (`routes.manifest.trailingSlash`, set on the server
 * and in the browser alike). Never on Vite (no such setting).
 *
 * @returns true when the app sets Next `trailingSlash: true`
 *
 * @version 0.1.0
 * @since 0.3.2
 * @author AMBROISE PARK Consulting
 */
export function appTrailingSlash(): boolean {
  return getDndevConfig()?.routes?.manifest?.trailingSlash === true;
}
