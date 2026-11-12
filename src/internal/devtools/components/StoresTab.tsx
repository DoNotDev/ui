'use client';
// packages/ui/src/internal/devtools/components/StoresTab.tsx

/**
 * @fileoverview Stores Tab Component
 * @description Displays registered Zustand stores from globalThis._DNDEV_STORES_
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import {
  Stack,
  Card,
  Accordion,
  ScrollArea,
  JsonViewer,
  Text,
  Badge,
  BADGE_VARIANT,
  Button,
  BUTTON_VARIANT,
} from '@donotdev/components';

const STORE_NAMES: Record<string, string> = {
  'theme-store': 'Theme',
  'consent-store': 'Consent',
  'navigation-store': 'Navigation',
  'loading-store': 'Loading',
  'overlay-store': 'Overlay',
  'network-store': 'Network',
  'abort-store': 'Abort',
  'i18n-store': 'i18n',
  'error-store': 'Error',
};

/** Zustand bound stores expose `getState`; registry values are untyped (`Record<string, any>` in core globals). */
function hasGetState(store: unknown): store is { getState: () => unknown } {
  return (
    (typeof store === 'function' || typeof store === 'object') &&
    store !== null &&
    'getState' in store &&
    typeof store.getState === 'function'
  );
}

/** Reads the `_error` marker that `refreshStores` writes for unreadable stores. */
function readStoreError(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !('_error' in state)) {
    return undefined;
  }
  return typeof state._error === 'string' ? state._error : undefined;
}

export const StoresTab = () => {
  const [storeStates, setStoreStates] = useState<Record<string, unknown>>({});
  const [storeNames, setStoreNames] = useState<string[]>([]);

  const refreshStores = useCallback(() => {
    const registry: Record<string, unknown> | undefined =
      globalThis._DNDEV_STORES_;
    if (!registry) {
      setStoreNames([]);
      setStoreStates({});
      return;
    }

    const names = Object.keys(registry);
    setStoreNames(names);

    const states: Record<string, unknown> = {};
    names.forEach((name) => {
      try {
        const store = registry[name];
        if (hasGetState(store)) {
          states[name] = store.getState();
        } else {
          states[name] = { _error: 'No getState method' };
        }
      } catch (e) {
        states[name] = { _error: String(e) };
      }
    });
    setStoreStates(states);
  }, []);

  useEffect(() => {
    // StoresTab is only rendered inside DevTools (dev-only), but guard defensively
    if (process.env.NODE_ENV !== 'development') return;
    refreshStores();
    const interval = setInterval(refreshStores, 1000);
    return () => clearInterval(interval);
  }, [refreshStores]);

  const getDisplayName = (name: string) =>
    STORE_NAMES[name] || name.replace(/-store$/, '').replace(/-/g, ' ');

  if (storeNames.length === 0) {
    return (
      <Stack style={{ padding: 'var(--gap-md)' }}>
        <Card title="Stores" subtitle="No stores registered">
          <Text className="dndev-text-muted-foreground">
            globalThis._DNDEV_STORES_ is empty or not initialized.
          </Text>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack style={{ padding: 'var(--gap-md)' }}>
      <Card
        title={
          <Stack
            direction="row"
            align="center"
            justify="between"
            className="dndev-w-full"
          >
            <span>Stores</span>
            <Stack direction="row" align="center" gap="tight">
              <Badge variant={BADGE_VARIANT.SECONDARY}>
                {storeNames.length}
              </Badge>
              <Button
                variant={BUTTON_VARIANT.GHOST}
                icon={RefreshCw}
                onClick={refreshStores}
                title="Refresh stores"
              />
            </Stack>
          </Stack>
        }
      >
        <Accordion
          type="single"
          collapsible
          items={storeNames.map((name) => {
            const state = storeStates[name];
            const storeError = readStoreError(state);

            return {
              value: name,
              trigger: (
                <Stack
                  direction="row"
                  align="center"
                  justify="between"
                  className="dndev-w-full"
                >
                  <Text className="dndev-font-medium">
                    {getDisplayName(name)}
                  </Text>
                  <Text className="dndev-font-mono dndev-text-xs dndev-text-muted-foreground">
                    {name}
                  </Text>
                </Stack>
              ),
              content: storeError ? (
                <Text className="dndev-text-destructive dndev-text-sm">
                  {storeError}
                </Text>
              ) : (
                <ScrollArea className="dndev-max-h-64">
                  <JsonViewer data={state} defaultDepth={2} showCopyButton />
                </ScrollArea>
              ),
            };
          })}
        />
      </Card>
    </Stack>
  );
};
