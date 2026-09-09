'use client';
// packages/ui/src/crud/components/CrudCardLink.tsx

/**
 * @fileoverview UI CrudCard wrapper
 * @description Thin wrapper around @donotdev/crud CrudCard that adds Link routing.
 * CrudCard (crud) is platform-agnostic; this wrapper adds web navigation via Link.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { CrudCardProps } from '@donotdev/core';

import { Link } from '../../routing';
import {
  isCrudModuleAvailable,
  CrudCard as BaseCrudCard,
} from '../crudImports';

/**
 * CrudCard with Link wrapping for web navigation.
 * When detailHref is provided, wraps the card in a Link for a11y/SEO.
 */
export function CrudCard({
  detailHref,
  onClick,
  ...rest
}: CrudCardProps & { detailHref?: string }) {
  // Safe guard: isCrudModuleAvailable is a module-level constant (immutable after load).

  if (!isCrudModuleAvailable) return null;

  // When detailHref is set, Link handles navigation — don't pass onClick to inner card
  const card = (
    <BaseCrudCard {...rest} onClick={detailHref ? undefined : onClick} />
  );

  if (detailHref) {
    return (
      <Link
        path={detailHref}
        aria-label={rest.item?.id ? `View ${rest.item.id}` : undefined}
      >
        {card}
      </Link>
    );
  }

  return card;
}

export default CrudCard;
