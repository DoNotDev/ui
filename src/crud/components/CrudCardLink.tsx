'use client';
// packages/ui/src/crud/components/CrudCardLink.tsx

/**
 * @fileoverview UI CrudCard wrapper
 * @description Thin wrapper around @donotdev/crud CrudCard for web navigation.
 * detailHref becomes the card's `href`: a real `<a href>` rendered through the app
 * router's link (registered by UIProviders), with controls kept outside the link.
 * @version 0.2.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { CrudCardProps } from '@donotdev/core';

import {
  isCrudModuleAvailable,
  CrudCard as BaseCrudCard,
} from '../crudImports';

/**
 * CrudCard with link navigation.
 * When detailHref is provided, the card links to it (crawlable, client-side navigation).
 */
export function CrudCard({
  detailHref,
  onClick,
  ...rest
}: CrudCardProps & { detailHref?: string }) {
  // Safe guard: isCrudModuleAvailable is a module-level constant (immutable after load).

  if (!isCrudModuleAvailable) return null;

  return detailHref ? (
    <BaseCrudCard {...rest} href={detailHref} />
  ) : (
    <BaseCrudCard {...rest} onClick={onClick} />
  );
}

export default CrudCard;
