'use client';
// packages/ui/src/components/common/Skeleton.tsx

/**
 * @fileoverview Skeleton component
 * @description Skeleton loading component with multiple variants
 *
 * ESCAPE HATCHES: width/height props provided for precise control in composites
 * and complex layouts. For most cases, prefer className with utility classes.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { ComponentType, CSSProperties } from 'react';

import { cn, Stack } from '@donotdev/components';

interface SkeletonProps {
  /** The type of skeleton to render */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /**
   * Width of the skeleton (ESCAPE HATCH - prefer className for styling)
   * Use when you need precise programmatic control (e.g., matching dynamic content)
   */
  width?: string | number;
  /**
   * Height of the skeleton (ESCAPE HATCH - prefer className for styling)
   * Use when you need precise programmatic control (e.g., matching dynamic content)
   */
  height?: string | number;
  /** Number of lines for text skeleton */
  lines?: number;
  /** Whether to show the skeleton */
  show?: boolean;
  /** CSS class name for additional styling */
  className?: string;
  /** Animation speed */
  animation?: 'pulse' | 'wave' | 'none';
  /** Custom inline styles */
  style?: React.CSSProperties;
}

/**
 * Skeleton - A loading placeholder component
 *
 * Features:
 * - Multiple variants for different content types
 * - Configurable dimensions via escape hatch props
 * - Accessibility support
 * - Smooth animations
 *
 * STYLING APPROACH:
 * - Prefer: <Skeleton className="h-4 w-[250px]" /> (utility classes)
 * - Escape hatch: <Skeleton width={dynamicWidth} height={40} /> (when programmatic)
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const Skeleton: ComponentType<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  show = true,
  className,
  animation = 'pulse',
  style, // Destructure style prop
}) => {
  if (!show) return null;

  const baseStyles: CSSProperties = {
    backgroundColor: 'var(--muted)',
    opacity: 'var(--opacity-muted)',
    borderRadius: 'var(--radius)',
    animation:
      animation === 'pulse' || animation === 'wave'
        ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        : 'none',
    ...(animation === 'wave' && {
      background:
        'linear-gradient(to right, color-mix(in srgb, var(--muted) 50%, transparent), color-mix(in srgb, var(--muted) 30%, transparent), color-mix(in srgb, var(--muted) 50%, transparent))',
    }),
  };

  const getSkeletonStyles = () => {
    const styles: CSSProperties = {};

    if (width) {
      styles.width = typeof width === 'number' ? `${width}px` : width;
    }

    if (height) {
      styles.height = typeof height === 'number' ? `${height}px` : height;
    }

    return styles;
  };

  // Text skeleton with multiple lines
  if (variant === 'text') {
    return (
      <Stack gap="tight">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn('dndev-skeleton', className)}
            style={{
              ...baseStyles,
              height: 'var(--gap-md)',
              width: index === lines - 1 ? '75%' : '100%',
              ...getSkeletonStyles(),
              ...style,
            }}
          />
        ))}
      </Stack>
    );
  }

  // Circular skeleton
  if (variant === 'circular') {
    return (
      <div
        className={cn('dndev-skeleton', className)}
        style={{
          ...baseStyles,
          borderRadius: 'var(--radius-full)',
          width: width || height || '40px',
          height: height || width || '40px',
          ...getSkeletonStyles(),
          ...style,
        }}
      />
    );
  }

  // Rectangular skeleton
  if (variant === 'rectangular') {
    return (
      <div
        className={cn('dndev-skeleton', className)}
        style={{
          ...baseStyles,
          width: width || '100%',
          height: height || '200px',
          ...getSkeletonStyles(),
          ...style,
        }}
      />
    );
  }

  // Rounded skeleton (default)
  return (
    <div
      className={cn('dndev-skeleton', className)}
      style={{
        ...baseStyles,
        borderRadius: 'var(--radius-lg)',
        width: width || '100%',
        height: height || '20px',
        ...getSkeletonStyles(),
        ...style,
      }}
    />
  );
};

/**
 * Text skeleton component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const SkeletonText: ComponentType<
  Omit<SkeletonProps, 'variant'> & { lines?: number }
> = (props) => <Skeleton variant="text" {...props} />;

/**
 * Avatar skeleton component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const SkeletonAvatar: ComponentType<
  Omit<SkeletonProps, 'variant'> & { size?: number }
> = ({ size = 40, ...props }) => (
  <Skeleton variant="circular" width={size} height={size} {...props} />
);

/**
 * Image skeleton component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const SkeletonImage: ComponentType<
  Omit<SkeletonProps, 'variant'> & { aspectRatio?: string }
> = ({ aspectRatio = '16/9', width = '100%', ...props }) => (
  <div style={{ aspectRatio }}>
    <Skeleton variant="rectangular" width={width} height="100%" {...props} />
  </div>
);

/**
 * Button skeleton component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const SkeletonButton: ComponentType<
  Omit<SkeletonProps, 'variant'> & { size?: 'sm' | 'md' | 'lg' }
> = ({ size = 'md', ...props }) => {
  const heightMap = { sm: 32, md: 40, lg: 48 };
  return (
    <Skeleton
      variant="rounded"
      height={heightMap[size]}
      width="auto"
      style={{ minWidth: '80px' }}
      {...props}
    />
  );
};

/**
 * Card skeleton component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const SkeletonCard: ComponentType<
  Omit<SkeletonProps, 'variant'> & {
    showImage?: boolean;
    showTitle?: boolean;
    showDescription?: boolean;
  }
> = ({
  showImage = true,
  showTitle = true,
  showDescription = true,
  className,
  ...props
}) => (
  <div
    className={cn('dndev-surface', className)}
    style={{
      display: 'grid',
      gap: 'var(--gap-md)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--gap-lg)',
    }}
  >
    {showImage && <SkeletonImage {...props} />}
    <Stack gap="tight">
      {showTitle && <SkeletonText lines={1} {...props} />}
      {showDescription && <SkeletonText lines={2} {...props} />}
    </Stack>
  </div>
);

/**
 * Table skeleton component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const SkeletonTable: ComponentType<
  Omit<SkeletonProps, 'variant'> & {
    rows?: number;
    columns?: number;
  }
> = ({ rows = 5, columns = 4, ...props }) => (
  <Stack gap="tight">
    {/* Header */}
    <Stack direction="row" style={{ gap: 'var(--gap-sm)' }}>
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton
          key={`header-${index}`}
          variant="rounded"
          height={20}
          style={{ flex: 1 }}
          {...props}
        />
      ))}
    </Stack>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Stack
        direction="row"
        key={`row-${rowIndex}`}
        style={{ gap: 'var(--gap-sm)' }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton
            key={`cell-${rowIndex}-${colIndex}`}
            variant="rounded"
            height={16}
            style={{ flex: 1 }}
            {...props}
          />
        ))}
      </Stack>
    ))}
  </Stack>
);

export default Skeleton;
