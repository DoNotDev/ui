// packages/ui/src/components/cookie-consent/CookieConsent.tsx

import { Cookie, Settings, Shield, BarChart3, Target } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import {
  Accordion,
  Button,
  BUTTON_VARIANT,
  Card,
  Switch,
  Text,
  cn,
  Stack,
} from '@donotdev/components';
import {
  handleError,
  useConsent,
  getCookieExamples,
  hasOptionalCookies as checkHasOptionalCookies,
} from '@donotdev/core';
import {
  CONSENT_CATEGORY,
  type AppCookieCategories,
  type DoNotDevCookieCategories,
} from '@donotdev/core';
import { useTranslation } from '@donotdev/core';
import { isClient } from '@donotdev/core';

/** Props for the CookieConsent component. */
export interface CookieConsentProps {
  /** Which screen edge the banner anchors to. */
  position?: 'bottom' | 'top';
  /** Optional wrapper class for custom positioning. */
  className?: string;
}

const MAX_WIDTH = 480;

function CookieConsent({
  position = 'bottom',
  className = '',
}: CookieConsentProps) {
  const hasConsented = useConsent('hasConsented');
  const categories = useConsent('categories');
  const acceptAll = useConsent('acceptAll');
  const declineAll = useConsent('declineAll');
  const updateCategory = useConsent('updateCategory');
  const storeShowBanner = useConsent('showBanner');
  const { t } = useTranslation('cookies');
  const [showPreferences, setShowPreferences] = useState(false);
  const [showBanner, setShowBanner] = useState(
    !hasConsented || storeShowBanner
  );
  const [preferenceCategories, setPreferenceCategories] =
    useState<AppCookieCategories>(categories);
  const bannerRef = useRef<HTMLDivElement>(null);

  /**
   * Consent lives in localStorage, so the server cannot know whether the banner
   * is needed: it always rendered it, and the client removed it on mount. For an
   * app whose categories are all necessary, that auto-accept path below made the
   * banner unconditional — every single load flashed a banner nobody could ever
   * act on, in whatever locale had not loaded yet. Rendering nothing until mount
   * makes the first client render match the server's, so there is no flash and no
   * hydration mismatch.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (storeShowBanner) {
      setShowBanner(true);
    }
  }, [storeShowBanner]);

  // Get categories actually required by the app's features
  const requiredCategories = Object.keys(categories) as string[];

  const categoryDefs = [
    {
      id: CONSENT_CATEGORY.NECESSARY,
      icon: Shield,
      title: t('essentialCookies'),
      description: t('essentialDescription'),
      examples: getCookieExamples('necessary') || t('essentialExamples'),
      locked: true,
    },
    {
      id: CONSENT_CATEGORY.FUNCTIONAL,
      icon: Cookie,
      title: t('functionalCookies'),
      description: t('functionalDescription'),
      examples: getCookieExamples('functional') || t('functionalExamples'),
      legalNotice: t('functionalLegalNotice'),
      locked: false,
    },
    {
      id: CONSENT_CATEGORY.ANALYTICS,
      icon: BarChart3,
      title: t('analyticsCookies'),
      description: t('analyticsDescription'),
      examples: getCookieExamples('analytics') || t('analyticsExamples'),
      locked: false,
    },
    {
      id: CONSENT_CATEGORY.MARKETING,
      icon: Target,
      title: t('marketingCookies'),
      description: t('marketingDescription'),
      examples: getCookieExamples('marketing') || t('marketingExamples'),
      locked: false,
    },
  ].filter((cat) => requiredCategories.includes(cat.id));

  const hasOptionalCategories = checkHasOptionalCookies();

  // Auto-accept if only necessary cookies (GDPR/CCPA — necessary don't need consent)
  useEffect(() => {
    if (!hasConsented && !hasOptionalCategories) {
      acceptAll();
    }
  }, [hasConsented, hasOptionalCategories, acceptAll]);

  // Sync local draft state when accordion opens — default optional ON for easier UX
  useEffect(() => {
    const defaulted = { ...categories };
    if (showPreferences) {
      const mutable = defaulted as Record<string, boolean | undefined>;
      Object.keys(mutable).forEach((cat) => {
        if (cat !== CONSENT_CATEGORY.NECESSARY && mutable[cat] === false) {
          mutable[cat] = true;
        }
      });
    }
    setPreferenceCategories(defaulted);
  }, [categories, showPreferences]);

  // Dismiss on outside click when banner is showing pre-consent
  useEffect(() => {
    if (!isClient() || hasConsented || !showBanner) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        bannerRef.current &&
        !bannerRef.current.contains(event.target as Node)
      ) {
        setShowBanner(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [hasConsented, showBanner]);

  if (!mounted) return null;
  if (hasConsented && !storeShowBanner) return null;

  const handleSave = () => {
    try {
      Object.entries(preferenceCategories).forEach(([cat, val]) => {
        if (cat !== CONSENT_CATEGORY.NECESSARY && val !== undefined) {
          const categoryKey = cat as keyof DoNotDevCookieCategories;
          if (Object.values(CONSENT_CATEGORY).includes(categoryKey)) {
            updateCategory(categoryKey, Boolean(val));
          }
        }
      });
      setShowPreferences(false);
      setShowBanner(false);
    } catch (error) {
      handleError(error, {
        userMessage: 'Error saving preferences',
        context: { operation: 'save_preferences' },
        severity: 'warning',
        log: true,
        reportToSentry: false,
        showNotification: false,
      });
    }
  };

  const handleAcceptAll = () => {
    acceptAll();
    setShowBanner(false);
  };

  const handleDeclineAll = () => {
    declineAll();
    setShowBanner(false);
  };

  const bannerContent = (
    <Stack gap="medium">
      <Text as="p" variant="muted" level="small" style={{ lineHeight: 1.55 }}>
        {t('cookieBannerDescription')}
      </Text>

      {hasOptionalCategories && (
        <Accordion
          type="single"
          collapsible
          value={showPreferences ? 'preferences' : ''}
          onValueChange={(value) => setShowPreferences(value === 'preferences')}
          items={[
            {
              value: 'preferences',
              trigger: (
                <Stack direction="row" align="center" gap="tight">
                  <Settings className="dndev-size-sm" />
                  <Text as="span" level="small" weight="medium">
                    {t('customize')}
                  </Text>
                </Stack>
              ),
              content: (
                <Stack gap="tight">
                  {categoryDefs.map((cat) => {
                    const Icon = cat.icon;
                    const enabled = preferenceCategories[cat.id] ?? false;
                    return (
                      <Stack
                        key={cat.id}
                        direction="row"
                        align="start"
                        justify="between"
                        gap="medium"
                        style={{
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-surface, 0.5rem)',
                          background: 'var(--muted)',
                        }}
                      >
                        <Stack
                          direction="row"
                          align="start"
                          gap="tight"
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <Icon
                            className="dndev-size-sm"
                            style={{
                              color: 'var(--primary)',
                              marginTop: '0.15rem',
                              flexShrink: 0,
                            }}
                          />
                          <Stack gap="none" style={{ minWidth: 0 }}>
                            <Text as="span" level="small" weight="semibold">
                              {cat.title}
                            </Text>
                            <Text
                              as="span"
                              variant="muted"
                              level="caption"
                              style={{ lineHeight: 1.45 }}
                            >
                              {cat.description}
                            </Text>
                          </Stack>
                        </Stack>
                        {cat.locked ? (
                          <Text
                            as="span"
                            variant="muted"
                            level="caption"
                            weight="medium"
                            style={{ flexShrink: 0 }}
                          >
                            {t('alwaysOn')}
                          </Text>
                        ) : (
                          <Switch
                            checked={enabled}
                            onCheckedChange={(val) =>
                              setPreferenceCategories((prev) => ({
                                ...prev,
                                [cat.id]: val,
                              }))
                            }
                          />
                        )}
                      </Stack>
                    );
                  })}
                </Stack>
              ),
            },
          ]}
        />
      )}
    </Stack>
  );

  const bannerFooter = showPreferences ? (
    <Stack direction="row" gap="tight" style={{ width: '100%' }}>
      <Button
        onClick={() => setShowPreferences(false)}
        variant={BUTTON_VARIANT.OUTLINE}
        style={{ flex: 1 }}
      >
        {t('form.cancel', 'Cancel')}
      </Button>
      <Button
        onClick={handleSave}
        variant={BUTTON_VARIANT.DEFAULT}
        style={{ flex: 1 }}
      >
        {t('savePreferences', 'Save Preferences')}
      </Button>
    </Stack>
  ) : (
    <Stack direction="row" gap="tight" style={{ width: '100%' }}>
      {hasOptionalCategories && (
        <Button
          onClick={handleDeclineAll}
          variant={BUTTON_VARIANT.OUTLINE}
          style={{ flex: 1 }}
        >
          {t('declineOptional')}
        </Button>
      )}
      <Button
        onClick={handleAcceptAll}
        variant={BUTTON_VARIANT.DEFAULT}
        style={{ flex: 1 }}
      >
        {t('acceptAll')}
      </Button>
    </Stack>
  );

  return (
    <>
      {showBanner && (
        <Card
          ref={bannerRef}
          elevated
          icon={Cookie}
          title={t('cookiePreferences')}
          content={bannerContent}
          footer={bannerFooter}
          className={cn('dndev-fixed dndev-z-modal', className)}
          style={{
            [position === 'top' ? 'top' : 'bottom']: 'var(--gap-md)',
            insetInlineStart: 'var(--gap-md)',
            width: `min(${MAX_WIDTH}px, calc(100vw - var(--gap-md) * 2))`,
            height: 'auto',
          }}
        />
      )}

      {!showBanner && !hasConsented && (
        <Button
          onClick={() => setShowBanner(true)}
          variant={BUTTON_VARIANT.OUTLINE}
          floating
          icon={Cookie}
          display="compact"
          tooltip={t('cookiePreferences')}
          aria-label={t('cookiePreferences')}
          className="dndev-fixed dndev-z-toast"
          style={{
            [position === 'top' ? 'top' : 'bottom']: 'var(--gap-md)',
            insetInlineStart: 'var(--gap-md)',
          }}
        />
      )}
    </>
  );
}

export default CookieConsent;
