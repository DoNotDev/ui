'use client';
// packages/ui/src/internal/devtools/components/CookieTab.tsx

/**
 * @fileoverview Cookie Debug Tab
 * @description Comprehensive cookie consent debugging tools
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { RefreshCw, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

import {
  Button,
  BUTTON_VARIANT,
  Card,
  CopyToClipboard,
  Badge,
  Label,
  toast,
  DescriptionList,
  Text,
  Stack,
} from '@donotdev/components';
import { useConsent, useConsentReady } from '@donotdev/core';
import { CONSENT_CATEGORY } from '@donotdev/core';
import { getCookie, deleteCookie } from '@donotdev/core';

const CONSENT_COOKIE_NAME = 'dndev-cookie-consent';

const formatJSON = (data: any) => {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return 'Error formatting data';
  }
};

export const CookieTab = () => {
  const hasConsented = useConsent('hasConsented');
  const categories = useConsent('categories');
  const timestamp = useConsent('timestamp');
  const version = useConsent('version');
  const reset = useConsent('reset');
  const showCookieBanner = useConsent('showCookieBanner');
  const isReady = useConsentReady();
  const [cookieValue, setCookieValue] = useState<string | null>(null);
  const [domInfo, setDomInfo] = useState<any>({});
  const [zIndexInfo, setZIndexInfo] = useState<any>({});

  const refreshData = () => {
    const cookie = getCookie(CONSENT_COOKIE_NAME);
    setCookieValue(cookie);
    toast('success', 'Data refreshed');

    const cookieBanner = document.querySelector('[class*="cookie"]');
    const dialogs = document.querySelectorAll('[role="dialog"]');
    const overlays = document.querySelectorAll('[class*="overlay"]');
    const portals = document.querySelectorAll('[data-radix-portal]');

    setDomInfo({
      cookieBanner: {
        exists: !!cookieBanner,
        visible: cookieBanner
          ? window.getComputedStyle(cookieBanner as Element).display !== 'none'
          : false,
        zIndex: cookieBanner
          ? window.getComputedStyle(cookieBanner as Element).zIndex
          : null,
        position: cookieBanner
          ? window.getComputedStyle(cookieBanner as Element).position
          : null,
        classes: cookieBanner ? (cookieBanner as Element).className : null,
      },
      dialogs: {
        count: dialogs.length,
        open: Array.from(dialogs).filter(
          (d) => d.getAttribute('data-state') === 'open'
        ).length,
        elements: Array.from(dialogs).map((d) => ({
          state: d.getAttribute('data-state'),
          zIndex: window.getComputedStyle(d).zIndex,
        })),
      },
      overlays: {
        count: overlays.length,
        visible: Array.from(overlays).filter(
          (o) => window.getComputedStyle(o).display !== 'none'
        ).length,
        zIndices: Array.from(overlays).map(
          (o) => window.getComputedStyle(o).zIndex
        ),
      },
      portals: {
        count: portals.length,
        elements: Array.from(portals).map((p) => ({
          zIndex: window.getComputedStyle(p).zIndex,
          children: p.children.length,
        })),
      },
    });

    const root = document.documentElement;
    setZIndexInfo({
      cssVariables: {
        '--z-overlay': getComputedStyle(root).getPropertyValue('--z-overlay'),
        '--z-modal': getComputedStyle(root).getPropertyValue('--z-modal'),
        '--z-tooltip': getComputedStyle(root).getPropertyValue('--z-tooltip'),
        '--z-toast': getComputedStyle(root).getPropertyValue('--z-toast'),
      },
      computed: {
        cookieBanner: cookieBanner
          ? window.getComputedStyle(cookieBanner as Element).zIndex
          : 'N/A',
        highestDialog:
          dialogs.length > 0
            ? Math.max(
                ...Array.from(dialogs).map((d) =>
                  parseInt(window.getComputedStyle(d).zIndex || '0', 10)
                )
              )
            : 0,
        highestOverlay:
          overlays.length > 0
            ? Math.max(
                ...Array.from(overlays).map((o) =>
                  parseInt(window.getComputedStyle(o).zIndex || '0', 10)
                )
              )
            : 0,
      },
    });
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleResetConsent = () => {
    reset();
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleClearCookie = () => {
    deleteCookie(CONSENT_COOKIE_NAME);
    refreshData();
    toast('success', 'Cookie cleared');
  };

  const consentStateItems = [
    {
      label: 'Has Consented',
      value: (
        <Badge variant={hasConsented ? 'default' : 'destructive'}>
          {hasConsented ? '✅ Yes' : '❌ No'}
        </Badge>
      ),
    },
    {
      label: 'Store Ready',
      value: (
        <Badge variant={isReady ? 'default' : 'destructive'}>
          {isReady ? '✅ Ready' : '❌ Not Ready'}
        </Badge>
      ),
    },
    {
      label: 'Timestamp',
      value: (
        <Text as="span" className="dndev-font-mono dndev-text-sm">
          {timestamp || 'Never'}
        </Text>
      ),
    },
    {
      label: 'Version',
      value: (
        <Text as="span" className="dndev-font-mono dndev-text-sm">
          {version || 'N/A'}
        </Text>
      ),
    },
  ];

  const categoryItems = Object.entries(CONSENT_CATEGORY).map(
    ([key, value]) => ({
      label: (
        <Text as="span" className="dndev-font-mono">
          {key}
        </Text>
      ),
      value: (
        <Badge
          variant={
            categories[value as keyof typeof categories]
              ? 'default'
              : 'destructive'
          }
        >
          {categories[value as keyof typeof categories]
            ? '✅ Enabled'
            : '❌ Disabled'}
        </Badge>
      ),
    })
  );

  return (
    <Stack gap="large">
      <Card
        title="Cookie Consent Debug"
        footer={
          <Stack direction="row" gap="tight">
            <Button
              onClick={refreshData}
              icon={RefreshCw}
              variant={BUTTON_VARIANT.OUTLINE}
              title="Refresh Data"
            >
              Refresh
            </Button>
            <Button
              onClick={handleResetConsent}
              icon={Trash2}
              variant={BUTTON_VARIANT.OUTLINE}
              title="Reset Consent & Reload"
            >
              Reset & Reload
            </Button>
          </Stack>
        }
      >
        <Stack gap="large">
          <Card
            title={
              <Stack
                direction="row"
                align="center"
                justify="between"
                className="dndev-w-full"
              >
                <span>Consent State</span>
                <CopyToClipboard
                  text={formatJSON({
                    hasConsented,
                    categories,
                    timestamp,
                    version,
                  })}
                  variant={BUTTON_VARIANT.GHOST}
                  onCopy={() => toast('success', 'Consent state copied')}
                />
              </Stack>
            }
          >
            <DescriptionList items={consentStateItems as any} />
          </Card>

          <Card
            title={
              <Stack
                direction="row"
                align="center"
                justify="between"
                className="dndev-w-full"
              >
                <span>Categories</span>
                <CopyToClipboard
                  text={formatJSON(categories)}
                  variant={BUTTON_VARIANT.GHOST}
                  onCopy={() => toast('success', 'Categories copied')}
                />
              </Stack>
            }
          >
            <DescriptionList items={categoryItems as any} />
          </Card>

          <Card
            title={
              <Stack
                direction="row"
                align="center"
                justify="between"
                className="dndev-w-full"
              >
                <span>Cookie Value</span>
                <Stack direction="row" gap="tight">
                  <CopyToClipboard
                    text={cookieValue || 'null'}
                    variant={BUTTON_VARIANT.GHOST}
                    onCopy={() => toast('success', 'Cookie value copied')}
                  />
                  <Button
                    onClick={handleClearCookie}
                    icon={Trash2}
                    variant={BUTTON_VARIANT.GHOST}
                    title="Clear Cookie"
                  >
                    Clear
                  </Button>
                </Stack>
              </Stack>
            }
          >
            <pre className="dndev-overflow-y-auto dndev-font-mono dndev-text-xs dndev-max-h-60">
              {cookieValue || 'No cookie found'}
            </pre>
          </Card>

          <Card
            title={
              <Stack
                direction="row"
                align="center"
                justify="between"
                className="dndev-w-full"
              >
                <span>DOM Elements</span>
                <CopyToClipboard
                  text={formatJSON(domInfo)}
                  variant={BUTTON_VARIANT.GHOST}
                  onCopy={() => toast('success', 'DOM info copied')}
                />
              </Stack>
            }
          >
            <Stack>
              <div>
                <Label className="dndev-font-semibold">Cookie Banner:</Label>
                <Stack gap="tight" className="dndev-ml-md">
                  <Text>
                    Exists: {domInfo.cookieBanner?.exists ? '✅' : '❌'}
                  </Text>
                  <Text>
                    Visible: {domInfo.cookieBanner?.visible ? '✅' : '❌'}
                  </Text>
                  <Text>z-index: {domInfo.cookieBanner?.zIndex || 'N/A'}</Text>
                  <Text>
                    Position: {domInfo.cookieBanner?.position || 'N/A'}
                  </Text>
                </Stack>
              </div>
              <div>
                <Label className="dndev-font-semibold">Dialogs:</Label>
                <Stack gap="tight" className="dndev-ml-md">
                  <Text>Count: {domInfo.dialogs?.count || 0}</Text>
                  <Text>Open: {domInfo.dialogs?.open || 0}</Text>
                </Stack>
              </div>
              <div>
                <Label className="dndev-font-semibold">Overlays:</Label>
                <Stack gap="tight" className="dndev-ml-md">
                  <Text>Count: {domInfo.overlays?.count || 0}</Text>
                  <Text>Visible: {domInfo.overlays?.visible || 0}</Text>
                </Stack>
              </div>
              <div>
                <Label className="dndev-font-semibold">Portals:</Label>
                <Stack gap="tight" className="dndev-ml-md">
                  <Text>Count: {domInfo.portals?.count || 0}</Text>
                </Stack>
              </div>
            </Stack>
          </Card>

          <Card
            title={
              <Stack
                direction="row"
                align="center"
                justify="between"
                className="dndev-w-full"
              >
                <span>Z-Index Stacking</span>
                <CopyToClipboard
                  text={formatJSON(zIndexInfo)}
                  variant={BUTTON_VARIANT.GHOST}
                  onCopy={() => toast('success', 'Z-index info copied')}
                />
              </Stack>
            }
          >
            <Stack>
              <div>
                <Label className="dndev-font-semibold">CSS Variables:</Label>
                <Stack
                  gap="tight"
                  className="dndev-ml-md dndev-font-mono dndev-text-sm"
                >
                  {Object.entries(zIndexInfo.cssVariables || {}).map(
                    ([key, value]) => (
                      <Text key={key}>
                        {key}: {String(value) || 'not set'}
                      </Text>
                    )
                  )}
                </Stack>
              </div>
              <div>
                <Label className="dndev-font-semibold">Computed Values:</Label>
                <Stack
                  gap="tight"
                  className="dndev-ml-md dndev-font-mono dndev-text-sm"
                >
                  {Object.entries(zIndexInfo.computed || {}).map(
                    ([key, value]) => (
                      <Text key={key}>
                        {key}: {String(value)}
                      </Text>
                    )
                  )}
                </Stack>
              </div>
            </Stack>
          </Card>

          <Card
            title={
              <Stack
                direction="row"
                align="center"
                justify="between"
                className="dndev-w-full"
              >
                <span>Full Store State</span>
                <CopyToClipboard
                  text={formatJSON({
                    hasConsented,
                    categories,
                    timestamp,
                    version,
                    isReady,
                  })}
                  variant={BUTTON_VARIANT.GHOST}
                  onCopy={() => toast('success', 'Store state copied')}
                />
              </Stack>
            }
          >
            <pre className="dndev-overflow-y-auto dndev-font-mono dndev-text-xs dndev-max-h-60">
              {formatJSON({
                hasConsented,
                categories,
                timestamp,
                version,
                isReady,
              })}
            </pre>
          </Card>

          <Card title="F12 DevTools Guide">
            <Stack gap="tight">
              <div>
                <Label className="dndev-font-semibold">1. Open DevTools:</Label>
                <Text as="span" className="dndev-ml-md dndev-text-sm">
                  Press <kbd>F12</kbd> or <kbd>Ctrl+Shift+I</kbd> (Windows) /{' '}
                  <kbd>Cmd+Option+I</kbd> (Mac)
                </Text>
              </div>
              <div>
                <Label className="dndev-font-semibold">2. Check Console:</Label>
                <Text as="span" className="dndev-ml-md dndev-text-sm">
                  Look for cookie-related errors or logs. Copy any errors you
                  see.
                </Text>
              </div>
              <div>
                <Label className="dndev-font-semibold">
                  3. Inspect Cookie Banner:
                </Label>
                <Stack gap="tight" className="dndev-ml-md dndev-text-sm">
                  <Text as="span">
                    • Right-click on page → "Inspect" → Find cookie banner
                    element
                  </Text>
                  <Text as="span">
                    • Check if element exists:{' '}
                    <code className="dndev-font-mono">
                      document.querySelector('[class*="cookie"]')
                    </code>
                  </Text>
                  <Text as="span">
                    • Check z-index: Look in "Computed" tab for z-index value
                  </Text>
                  <Text as="span">
                    • Check visibility: Look for{' '}
                    <code className="dndev-font-mono">display: none</code> or{' '}
                    <code className="dndev-font-mono">opacity: 0</code>
                  </Text>
                </Stack>
              </div>
              <div>
                <Label className="dndev-font-semibold">
                  4. Check Application Tab:
                </Label>
                <Stack gap="tight" className="dndev-ml-md dndev-text-sm">
                  <Text as="span">
                    • Go to "Application" → "Cookies" → Your domain
                  </Text>
                  <Text as="span">
                    • Look for{' '}
                    <code className="dndev-font-mono">
                      dndev-cookie-consent
                    </code>{' '}
                    cookie
                  </Text>
                  <Text as="span">• Check its value and expiration</Text>
                </Stack>
              </div>
              <div>
                <Label className="dndev-font-semibold">
                  5. Check Elements Tab:
                </Label>
                <Stack gap="tight" className="dndev-ml-md dndev-text-sm">
                  <Text as="span">
                    • Search for{' '}
                    <code className="dndev-font-mono">[data-radix-portal]</code>{' '}
                    to find portals
                  </Text>
                  <Text as="span">
                    • Check if any overlay is covering the banner (z-index
                    higher than banner)
                  </Text>
                  <Text as="span">
                    • Use "Select element" tool (top-left icon) to hover and see
                    z-index
                  </Text>
                </Stack>
              </div>
              <div>
                <Label className="dndev-font-semibold">
                  6. Console Commands:
                </Label>
                <Stack
                  gap="tight"
                  className="dndev-ml-md dndev-text-sm dndev-font-mono"
                >
                  <Text as="span">
                    • Get cookie:{' '}
                    <code>
                      document.cookie.split('; ').find(c =&gt;
                      c.startsWith('dndev-cookie-consent'))
                    </code>
                  </Text>
                  <Text as="span">
                    • Find banner:{' '}
                    <code>document.querySelector('[class*="cookie"]')</code>
                  </Text>
                  <Text as="span">
                    • Check z-index:{' '}
                    <code>
                      getComputedStyle(document.querySelector('[class*="cookie"]')).zIndex
                    </code>
                  </Text>
                  <Text as="span">
                    • Find all dialogs:{' '}
                    <code>document.querySelectorAll('[role="dialog"]')</code>
                  </Text>
                </Stack>
              </div>
            </Stack>
          </Card>
        </Stack>
      </Card>
    </Stack>
  );
};
