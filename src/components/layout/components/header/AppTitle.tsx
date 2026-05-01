// packages/ui/src/components/layout/components/header/AppTitle.tsx

/**
 * @fileoverview AppTitle component
 * @description Simple app title using text-base styling
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { cn } from '@donotdev/components';
import { useAppConfig, useBreakpoint } from '@donotdev/core';

import { Link } from '../../../../routing/Link';

/** Props for the AppTitle component. */
export interface AppTitleProps {
  /** Application title text - defaults to app.name from AppConfig */
  title?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to link to home (default: true) */
  linkToHome?: boolean;
}

/**
 * AppTitle - Simple app title using text-base xl
 * Automatically gets app name from AppConfig if title not provided
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export const AppTitle = ({
  title,
  className,
  linkToHome = true,
}: AppTitleProps) => {
  const isMobileOrTablet = useBreakpoint('isMobileOrTablet');
  const appName = useAppConfig('name');
  const appShortName = useAppConfig('shortName');

  const displayTitle =
    title || (isMobileOrTablet ? appShortName || appName : appName) || 'App';

  const content = (
    <div
      className={cn('dndev-text-base', className)}
      style={{
        fontSize: 'var(--font-size-xl)',
        fontWeight: 700,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}
    >
      {displayTitle}
    </div>
  );

  if (linkToHome) {
    return (
      <Link path="/" className={cn('dndev-inline-block', className)}>
        {content}
      </Link>
    );
  }

  return content;
};

export default AppTitle;
