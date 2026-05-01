// packages/ui/src/components/layout/PageContainer.tsx

/**
 * @fileoverview PageContainer - Semantic Layout Wrapper with Automatic SEO
 * @description Takes all available space from Layout parent, provides automatic meta tags
 * @package @donotdev/ui
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Suspense } from 'react';

import { cn } from '@donotdev/components';
import type { Density } from '@donotdev/core';

import DnDevErrorBoundary from '../../internal/common/DnDevErrorBoundary';
import RouteErrorFallback from '../../internal/common/RouteErrorFallback';

import type { ComponentProps, ComponentType, ReactNode } from 'react';

function PageContainerErrorFallback(
  props: ComponentProps<typeof RouteErrorFallback>
) {
  return (
    <Suspense fallback={<div>Loading error fallback...</div>}>
      <RouteErrorFallback {...props} />
    </Suspense>
  );
}

/**
 * Page container variants - semantic layout patterns
 */
export type PageContainerVariant =
  | 'full' // No constraints
  | 'standard' // 1480px general content
  | 'docs' // 900px reading width
  | 'narrow' // 600px mobile-first single column (PWA, app-like)
  | 'fixed'; // Fixed frame

/**
 * PageContainer component props
 */
interface PageContainerProps {
  /** Layout variant to use */
  variant?: PageContainerVariant;

  /** Density preset - controls spacing and typography */
  density?: Density;

  /** Additional CSS classes */
  className?: string;

  /** Child content */
  children: ReactNode;

  /** Whether to center the container */
  centered?: boolean;

  /** Add gap-lg spacing to first child */
  gapFirst?: boolean;
}

/**
 * PageContainer - Layout wrapper with semantic width constraints
 *
 * DnDevLayout already handles:
 * - Main padding via --content-padding
 * - Sidebar/header spacing
 * - Responsive behavior
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 *
 * PageContainer provides:
 * - Semantic width constraints without additional padding
 * - Automatic spacing system using CSS variables
 *
 */
export const PageContainer: ComponentType<PageContainerProps> = ({
  variant = 'standard',
  density,
  className,
  children,
  centered = true,
  gapFirst = false,
}) => {
  return (
    <DnDevErrorBoundary level="route" fallback={PageContainerErrorFallback}>
      <div
        className={cn('dndev-container', className)}
        data-variant={variant}
        data-density={density}
        data-centered={centered ? 'true' : 'false'}
        data-gap-first={gapFirst ? 'true' : undefined}
      >
        {children}
      </div>
    </DnDevErrorBoundary>
  );
};
