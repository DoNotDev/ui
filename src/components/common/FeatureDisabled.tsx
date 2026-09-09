'use client';
// packages/ui/src/components/common/FeatureDisabled.tsx

/**
 * @fileoverview FeatureDisabled Component
 * @description Reusable component for displaying feature unavailable/disabled states
 *
 * This component provides a consistent UI for when features are not available,
 * whether due to missing packages, disabled configuration, or other reasons.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { AlertCircle, RefreshCw, Mail, Cookie } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, Button, BUTTON_VARIANT, Stack } from '@donotdev/components';
import { useTranslation } from '@donotdev/core';

/** Props for the FeatureDisabled component. */
export interface FeatureDisabledProps {
  /**
   * Name of the feature that's disabled
   */
  featureName: string;

  /**
   * Optional title (defaults to featureName)
   */
  title?: string;

  /**
   * Optional description explaining why the feature is disabled
   */
  description?: string;

  /**
   * Show "Review Cookies" action button
   */
  showReviewCookies?: boolean;

  /**
   * Show "Contact Support" action button
   */
  showContactSupport?: boolean;

  /**
   * Show "Retry" action button
   */
  showRetry?: boolean;

  /**
   * Support email address (for contact support button)
   */
  supportEmail?: string;

  /**
   * Callback when retry button is clicked
   */
  onRetry?: () => void;

  /**
   * Callback when review cookies button is clicked
   */
  onReviewCookies?: () => void;

  /**
   * Custom actions to display
   */
  customActions?: ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * FeatureDisabled - Component for displaying feature unavailable states
 *
 * Provides a consistent UI pattern for when features are disabled or unavailable.
 * Includes options for review cookies, contact support, and retry actions.
 *
 * @example
 * ```tsx
 * <FeatureDisabled
 * featureName="Billing"
 * description="Stripe billing is not configured"
 * showContactSupport={true}
 * showRetry={true}
 * onRetry={() => window.location.reload()}
 * />
 * ```
 *
 * @param props - FeatureDisabled component props
 * @returns React component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
function FeatureDisabled({
  featureName,
  title,
  description,
  showReviewCookies = false,
  showContactSupport = true,
  showRetry = false,
  supportEmail = 'support@example.com',
  onRetry,
  onReviewCookies,
  customActions,
  className = '',
}: FeatureDisabledProps) {
  const { t } = useTranslation('ui');

  const defaultDescription =
    description ||
    t(
      'featureDisabled.description',
      '{featureName} is not available. This may be due to missing configuration or disabled features.',
      { featureName }
    );

  const handleReviewCookies = () => {
    if (onReviewCookies) {
      onReviewCookies();
    } else {
      // Default: try to open cookie consent if available
      const event = new CustomEvent('openCookieConsent');
      window.dispatchEvent(event);
    }
  };

  const handleContactSupport = () => {
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(
      `Feature Unavailable: ${featureName}`
    )}&body=${encodeURIComponent(
      `I'm experiencing an issue with ${featureName} not being available.`
    )}`;
  };

  return (
    <Card
      className={className}
      title={
        <Stack direction="row" align="center" gap="tight">
          <AlertCircle
            className="dndev-size-md"
            style={{ color: 'var(--destructive)' }}
          />
          {title || featureName}
        </Stack>
      }
      subtitle={defaultDescription}
    >
      {' '}
      <div style={{ display: 'grid', gap: 'var(--gap-md)' }}>
        {/* Actions */}
        {(showReviewCookies ||
          showContactSupport ||
          showRetry ||
          customActions) && (
          <Stack direction="row" wrap="wrap" gap="tight">
            {showReviewCookies && (
              <Button
                variant={BUTTON_VARIANT.OUTLINE}
                onClick={handleReviewCookies}
                icon={Cookie}
              >
                {t('featureDisabled.reviewCookies', 'Review Cookies')}
              </Button>
            )}

            {showContactSupport && (
              <Button
                variant={BUTTON_VARIANT.OUTLINE}
                onClick={handleContactSupport}
                icon={Mail}
              >
                {t('featureDisabled.contactSupport', 'Contact Support')}
              </Button>
            )}

            {showRetry && (
              <Button
                variant={BUTTON_VARIANT.OUTLINE}
                onClick={onRetry}
                icon={RefreshCw}
              >
                {t('featureDisabled.retry', 'Retry')}
              </Button>
            )}

            {customActions}
          </Stack>
        )}

        {/* Help Text */}
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--muted-foreground)',
          }}
        >
          {t(
            'featureDisabled.helpText',
            'If you believe this is an error, please contact support or try refreshing the page.'
          )}
        </p>
      </div>
    </Card>
  );
}

export default FeatureDisabled;
