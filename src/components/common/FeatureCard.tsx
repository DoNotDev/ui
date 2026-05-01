'use client';
// packages/ui/src/components/common/FeatureCard.tsx

/**
 * @fileoverview FeatureCard component
 * @description Card wrapper with content array and routing support
 *
 * Default: title and subtitle each use a `maxLines` line clamp → Content (1fr).
 * Pass `maxLines={0}` to disable clamps/ellipsis only (typography); Card/Link height stays `100%` like always.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import {
  Card,
  IconBox,
  Stack,
  Text,
  renderCardContent,
} from '@donotdev/components';
import type { CardProps, CardVariant, CardContent } from '@donotdev/components';

import { Link } from '../../routing';

import type { CSSProperties, ReactNode } from 'react';

/** Variant type alias for FeatureCard (matches CardVariant). */
export type FeatureCardVariant = CardVariant;

/** Props for the FeatureCard component. */
export interface FeatureCardProps extends Omit<
  CardProps,
  'content' | 'href' | 'title' | 'subtitle' | 'children'
> {
  /** Title (required) */
  title: string | ReactNode;
  /** Subtitle (required) */
  subtitle: string | ReactNode;
  /**
   * Card content - string, string[], or ReactNode.
   * For lists with icons, pass `<List icon={...} items={...} />` directly.
   */
  content?: CardContent;
  /** Route path - enables routing via Link */
  href?: string;
  /** When true, apply clickable styling (cursor, hover) even without href/onClick. Use when card is a dialog trigger. */
  clickable?: boolean;
  /**
   * Max lines for title and subtitle (each). Pass `0` for no line clamp.
   * @default 2
   */
  maxLines?: number;
}

/**
 * FeatureCard - Card wrapper with content array and routing
 *
 * Uses Card component internally. Routing via Link when href provided.
 */
const FeatureCard = ({
  icon,
  title,
  subtitle,
  content,
  href,
  variant,
  elevated,
  onClick,
  className,
  footer,
  style,
  clickable,
  maxLines = 2,
  ...cardProps
}: FeatureCardProps) => {
  const contentNode = renderCardContent(content);

  const n = maxLines;

  const titleRowHeight =
    n <= 0
      ? 'auto'
      : `calc(var(--font-size-lg) * var(--line-height) * ${n} + var(--gap-md))`;
  const subtitleRowHeight =
    n <= 0
      ? 'auto'
      : `calc(var(--font-size-base) * var(--line-height) * ${n} + var(--gap-md))`;

  const gridTemplateRows = `${titleRowHeight} ${subtitleRowHeight} 1fr${footer ? ' auto' : ''}`;

  const clampBlock = (lines: number): CSSProperties =>
    lines <= 0
      ? {
          display: 'block',
          overflow: 'visible',
          wordBreak: 'break-word',
          lineHeight: 'var(--line-height)',
          WebkitLineClamp: 'unset',
          WebkitBoxOrient: 'unset',
        }
      : {
          display: '-webkit-box',
          WebkitLineClamp: lines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          wordBreak: 'break-word',
          lineHeight: 'var(--line-height)',
        };

  const titleStyle: CSSProperties = {
    ...clampBlock(n),
    fontSize: 'var(--font-size-lg)',
    fontWeight: 600,
    color: 'inherit',
    margin: 0,
    textAlign: 'start',
    flex: 1,
    minWidth: 0,
  };

  const subtitleStyle: CSSProperties = {
    ...clampBlock(n),
    fontSize: 'var(--font-size-base)',
    fontWeight: n <= 0 ? 500 : 600,
    color: 'var(--muted-foreground)',
    margin: 0,
  };

  const titleContent: ReactNode = icon ? (
    <Stack
      direction="row"
      align={n <= 0 ? 'start' : 'center'}
      style={{ width: '100%' }}
    >
      <IconBox icon={icon} />
      <Text as="div" level="h3" style={titleStyle}>
        {title}
      </Text>
    </Stack>
  ) : (
    <Text as="div" level="h3" style={titleStyle}>
      {title}
    </Text>
  );

  const card = (
    <Card
      variant={variant}
      elevated={elevated}
      onClick={onClick}
      className={className}
      data-clickable={href || onClick || clickable ? 'true' : undefined}
      style={{
        paddingInlineStart: 'var(--gap-md)',
        paddingInlineEnd: 'var(--gap-md)',
        gap: 'var(--gap-md)',
        height: '100%',
        textAlign: 'start',
        ...style,
      }}
      {...cardProps}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateRows: gridTemplateRows,
          gap: 'var(--gap-md)',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: n <= 0 ? 'flex-start' : 'center',
            justifyContent: 'flex-start',
          }}
        >
          {titleContent}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          }}
        >
          <Text as="div" level="body" style={subtitleStyle}>
            {subtitle}
          </Text>
        </div>

        <div>{contentNode}</div>

        {footer && <div>{footer}</div>}
      </div>
    </Card>
  );

  if (href && !onClick) {
    return (
      <Link
        path={href}
        style={{
          display: 'block',
          textDecoration: 'none',
          height: '100%',
        }}
        aria-label={title ? `Learn more about ${title}` : undefined}
      >
        {card}
      </Link>
    );
  }

  return card;
};

export default FeatureCard;
