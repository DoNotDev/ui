// packages/ui/src/components/layout/components/header/GameTitle.tsx

/**
 * @fileoverview Game Title Component
 * @description Dynamic title for game preset header. Reads from layout store.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import {
  useTranslation,
  maybeTranslate,
  useLayout,
  useAppConfig,
} from '@donotdev/core';

import { Link } from '../../../../routing';

/** Props for the GameTitle component. */
export interface GameTitleProps {
  /** Whether to render app name as a Link (default: false) */
  asLink?: boolean;
  /** Additional CSS classes for wrapper */
  className?: string;
}

/**
 * GameTitle Component
 *
 * Renders title/subtitle when available (from themeStore), otherwise falls back to app name.
 * Used in game preset header center slot.
 *
 * Non-negotiable: This component is always rendered in the center of game header.
 *
 * @param props - GameTitle component props
 * @returns React component
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const GameTitle = ({ asLink = false, className }: GameTitleProps) => {
  const app = useAppConfig('app');
  const titleKey = useLayout('gameTitle');
  const subtitleKey = useLayout('gameSubtitle');
  const namespace = useLayout('gameNamespace');
  const { t } = useTranslation(namespace || 'dndev');

  const title = maybeTranslate(t, titleKey ?? undefined);
  const subtitle = maybeTranslate(t, subtitleKey ?? undefined);
  const appName = app?.name || 'Game';

  if (title) {
    return (
      <div className={className}>
        <div style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                color: 'var(--muted-foreground)',
                fontSize: 'var(--font-size-sm)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    );
  }

  const appNameElement = (
    <h2
      style={{
        fontSize: 'var(--font-size-lg)',
        fontWeight: 600,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {appName}
    </h2>
  );

  if (asLink) {
    return (
      <Link
        path="/"
        className={className}
        style={{
          fontSize: 'var(--font-size-2xl)',
          fontWeight: 700,
          transition: 'color var(--dur-fast) ease-out',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = 'var(--foreground)')
        }
      >
        {appName}
      </Link>
    );
  }

  return <div className={className}>{appNameElement}</div>;
};
