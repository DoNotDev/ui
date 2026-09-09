// packages/ui/src/components/common/TechBento.tsx

import { useState } from 'react';
import type { CSSProperties } from 'react';

import {
  Bento,
  Card,
  Section,
  Stack,
  Text,
  TONE,
  cn,
} from '@donotdev/components';
import type {
  BentoColumns,
  BentoGap,
  CardVariant,
  ResponsiveCols,
  Tone,
} from '@donotdev/components';

import { techLogos, type TechKey } from '../../data/techLogos';
import { sanitizeSvg } from '../../utils/sanitizeSvg';

/** Props for the TechBento component. */
export type TechBentoProps = {
  title?: string;
  techs: Array<{
    name: TechKey;
    size?: 'normal' | 'long' | 'high' | 'huge';
    variant?: CardVariant;
  }>;
  /**
   * Number of columns - fixed or responsive (same as Grid)
   * - number: fixed columns (same on all breakpoints)
   * - [mobile, tablet, laptop, desktop]: responsive columns per breakpoint
   * @default 3
   * @example 3 - always 3 columns
   * @example [1, 1, 2, 3] - 1 col mobile/tablet, 2 laptop, 3 desktop
   */
  cols?: number | ResponsiveCols;
  /**
   * @deprecated Use `cols` prop instead. Kept for backward compatibility.
   */
  columns?: BentoColumns;
  gap?: BentoGap;
  separator?: boolean;
  /** Tone system for background colors (matches Section/CallToAction) */
  tone?: Tone;
  /** Content alignment @default 'center' */
  align?: 'start' | 'center' | 'end';
  /** Whether the section is collapsible */
  collapsible?: boolean;
  /** Controlled open state (when collapsible) */
  open?: boolean;
  /** Callback when open state changes (when collapsible) */
  onOpenChange?: (open: boolean) => void;
  /** Default open state (uncontrolled, when collapsible) */
  defaultOpen?: boolean;
  className?: string;
};

function TechCard({
  techKey,
  variant,
}: {
  techKey: TechKey;
  variant?: CardVariant;
}) {
  const logo = techLogos[techKey];
  const [isHovered, setIsHovered] = useState(false);

  if (!logo) return null;

  const rawSvg = decodeURIComponent(
    logo.svg.replace('data:image/svg+xml,', '')
  );
  const decodedSvg = sanitizeSvg(rawSvg);

  return (
    <Card
      variant={variant}
      className="dndev-tech-card"
      style={{ '--tech-color': logo.color } as CSSProperties}
      data-hover={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Stack direction="column" align="center" gap="tight">
        <div
          className="dndev-tech-card-logo"
          data-tech={techKey}
          dangerouslySetInnerHTML={{ __html: decodedSvg }}
        />
        <Text as="span" level="small">
          {logo.name}
        </Text>
      </Stack>
    </Card>
  );
}

export function TechBento({
  title,
  techs,
  cols = 3,
  columns,
  gap = 'medium',
  separator = false,
  tone = TONE.GHOST,
  align,
  collapsible,
  open,
  onOpenChange,
  defaultOpen,
  className,
}: TechBentoProps) {
  // Convert Grid's cols format to Bento's columns format
  // Grid: [mobile, tablet, laptop, desktop]
  // Bento: { mobile, tablet, desktop, wide }
  const bentoColumns: BentoColumns = columns
    ? columns
    : typeof cols === 'number'
      ? {
          mobile: cols,
          tablet: cols,
          desktop: cols,
          wide: cols,
        }
      : {
          mobile: cols[0],
          tablet: cols[1],
          desktop: cols[2], // Grid's laptop → Bento's desktop
          wide: cols[3], // Grid's desktop → Bento's wide
        };

  const getSpan = (size?: string) => {
    if (size === 'long') return { cols: 2, rows: 1 };
    if (size === 'high') return { cols: 1, rows: 2 };
    if (size === 'huge') return { cols: 2, rows: 2 };
    return undefined;
  };

  const items = techs
    .filter((tech) => techLogos[tech.name])
    .map((tech) => ({
      id: tech.name,
      content: <TechCard techKey={tech.name} variant={tech.variant} />,
      span: getSpan(tech.size),
    }));

  const bento = (
    <Bento
      items={items}
      columns={bentoColumns}
      gap={gap}
      ariaLabel="Technology stack"
    />
  );

  // Always use Section - TechBento is a Section with a Bento grid
  return (
    <Section
      title={title}
      separator={separator}
      tone={tone}
      align={align}
      collapsible={collapsible}
      open={open}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
      className={cn('dndev-tech-bento', className)}
    >
      <div className="dndev-tech-bento-grid">{bento}</div>
    </Section>
  );
}

export default TechBento;
