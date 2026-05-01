// packages/ui/src/internal/layout/components/footer/FooterCopyright.tsx

/**
 * @fileoverview FooterCopyright Component
 * @description Copyright notice with year and app name, uses translations
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { cn } from '@donotdev/components';
import { useTranslation, useAppConfig } from '@donotdev/core';

export interface FooterCopyrightProps {
  /** App name (auto-reads from config if not provided) */
  appName?: string;

  /** Copyright year (defaults to current year) */
  year?: number;

  /** Additional CSS classes */
  className?: string;
}

/**
 * FooterCopyright - Copyright notice component
 *
 * Uses useTranslation internally, so it re-renders when language changes.
 * If appName not provided, reads from app config automatically.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const FooterCopyright: React.ComponentType<FooterCopyrightProps> = ({
  appName,
  year = new Date().getFullYear(),
  className,
}) => {
  const { t } = useTranslation('dndev');
  const app = useAppConfig('app');
  const resolvedAppName = appName || app?.name || 'App';

  return (
    <span
      className={cn(className)}
      style={{
        flexShrink: 0,
        color: 'var(--muted-foreground)',
        fontSize: 'var(--font-size-xs)',
      }}
    >
      © {year} {resolvedAppName}. {t('footer.legal.allRightsReserved')}
    </span>
  );
};

export default FooterCopyright;
