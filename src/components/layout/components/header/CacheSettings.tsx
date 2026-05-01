'use client';
// packages/ui/src/components/layout/components/header/CacheSettings.tsx

/**
 * @fileoverview CacheSettings component
 * @description Cache settings component for clearing various caches
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  BUTTON_VARIANT,
  Checkbox,
  Stack,
  useToast,
} from '@donotdev/components';
import { useTranslation } from '@donotdev/core';
// Platform-specific hooks via conditional exports
import { useRefresh } from '@donotdev/ui/routing/hooks';

/**
 * CacheSettings - Cache settings component for clearing various caches
 *
 * Provides UI for clearing browser caches including localStorage, sessionStorage,
 * cookies, IndexedDB, and service worker caches.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
function CacheSettings() {
  const { t } = useTranslation('dndev');
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);
  const refresh = useRefresh();

  // Simple local state - no need for global store
  const [cacheOptions, setCacheOptions] = useState({
    localStorage: true,
    sessionStorage: true,
    applicationCache: true,
    serviceWorker: true,
    cookies: true,
    indexedDB: true,
    webSQL: true,
    memoryCache: true,
  });

  const clearSelectedCache = async () => {
    try {
      setIsClearing(true);
      const clearedItems: string[] = [];

      // Clear localStorage
      if (cacheOptions.localStorage && typeof window !== 'undefined') {
        try {
          localStorage.clear();
          clearedItems.push('localStorage');
        } catch (err) {
          console.error('Failed to clear localStorage:', err);
        }
      }

      // Clear sessionStorage
      if (cacheOptions.sessionStorage && typeof window !== 'undefined') {
        try {
          sessionStorage.clear();
          clearedItems.push('sessionStorage');
        } catch (err) {
          console.error('Failed to clear sessionStorage:', err);
        }
      }

      // Clear IndexedDB
      if (
        cacheOptions.indexedDB &&
        typeof window !== 'undefined' &&
        'indexedDB' in window
      ) {
        try {
          // Get all databases and delete them
          if ('databases' in indexedDB) {
            const databases = await indexedDB.databases();
            await Promise.all(
              databases.map(async (db) => {
                if (db.name) {
                  const deleteReq = indexedDB.deleteDatabase(db.name);
                  await new Promise((resolve, reject) => {
                    deleteReq.onsuccess = () => resolve(undefined);
                    deleteReq.onerror = () => reject(deleteReq.error);
                  });
                }
              })
            );
          }
          clearedItems.push('IndexedDB');
        } catch (err) {
          console.error('Failed to clear IndexedDB:', err);
        }
      }

      if (
        cacheOptions.webSQL &&
        typeof window !== 'undefined' &&
        'openDatabase' in window
      ) {
        try {
          const db = (globalThis as any).openDatabase('', '', '', '');
          if (db && db.transaction) {
            db.transaction((tx: any) => {
              tx.executeSql(
                'SELECT name FROM sqlite_master WHERE type="table"',
                [],
                (tx: any, results: any) => {
                  for (let i = 0; i < results.rows.length; i++) {
                    const tableName = results.rows.item(i).name;
                    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
                      tx.executeSql(`DROP TABLE IF EXISTS ${tableName}`);
                    }
                  }
                }
              );
            });
          }
          clearedItems.push('WebSQL');
        } catch (err) {
          console.error('Failed to clear WebSQL:', err);
        }
      }

      // Clear Application Cache API
      if (
        cacheOptions.applicationCache &&
        typeof window !== 'undefined' &&
        'caches' in window
      ) {
        try {
          const keys = await caches.keys();
          await Promise.all(
            keys.map(async (key) => {
              try {
                await caches.delete(key);
              } catch (err) {
                console.error(`Failed to delete cache ${key}:`, err);
              }
            })
          );
          clearedItems.push('Application Cache');
        } catch (err) {
          console.error('Failed to clear application cache:', err);
        }
      }

      // Clear Service Workers
      if (cacheOptions.serviceWorker && 'serviceWorker' in navigator) {
        try {
          const registrations =
            await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map(async (reg) => {
              try {
                await reg.unregister();
              } catch (err) {
                console.error('Failed to unregister service worker:', err);
              }
            })
          );
          clearedItems.push('Service Workers');
        } catch (err) {
          console.error('Failed to clear service workers:', err);
        }
      }

      // Clear cookies
      if (cacheOptions.cookies) {
        try {
          // Clear all cookies for current domain
          document.cookie.split(';').forEach((cookie) => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.slice(0, eqPos) : cookie;
            document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
          });
          clearedItems.push('Cookies');
        } catch (err) {
          console.error('Failed to clear cookies:', err);
        }
      }

      // Clear memory cache (force garbage collection if available)
      if (cacheOptions.memoryCache) {
        try {
          // Force garbage collection if available (Chrome DevTools)
          if ('gc' in window && typeof (globalThis as any).gc === 'function') {
            (globalThis as any).gc();
          }
          clearedItems.push('Memory Cache');
        } catch (err) {
          console.error('Failed to clear memory cache:', err);
        }
      }

      const successMessage =
        clearedItems.length > 0
          ? t(
              'settings.clearCache.success',
              'Cache cleared successfully: {{items}}',
              {
                items: clearedItems.join(', '),
              }
            )
          : t(
              'settings.clearCache.noItemsCleared',
              'No cache items were cleared'
            );

      toast('success', successMessage);

      // Reload if any significant caches were cleared
      if (clearedItems.length > 0) {
        setTimeout(() => {
          // Clear store registry (DEV mode: HMR preserves globalThis, prevents re-init)
          if (typeof globalThis !== 'undefined' && globalThis._DNDEV_STORES_) {
            globalThis._DNDEV_STORES_ = {};
          }
          // Force hard reload (bypasses HMR)
          if (typeof window !== 'undefined') {
            window.location.href = window.location.href;
          } else {
            refresh();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast('error', t('settings.clearCache.error', 'Error clearing cache'));
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Stack>
      <Stack>
        {Object.entries(cacheOptions).map(([key, checked]) => (
          <Stack key={key} direction="row" align="center" gap="tight">
            <Checkbox
              id={key}
              checked={checked}
              onCheckedChange={(checked) =>
                setCacheOptions((prev) => ({ ...prev, [key]: !!checked }))
              }
            />
            <label
              htmlFor={key}
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                lineHeight: 1,
                cursor: 'pointer',
              }}
            >
              {t(
                `settings.clearCache.${key}`,
                key.charAt(0).toUpperCase() + key.slice(1)
              )}
            </label>
          </Stack>
        ))}
      </Stack>

      <Button
        variant={BUTTON_VARIANT.DESTRUCTIVE}
        style={{ margin: '0 auto' }}
        disabled={isClearing || !Object.values(cacheOptions).some(Boolean)}
        onClick={clearSelectedCache}
        icon={Trash2}
      >
        {isClearing
          ? t('settings.clearCache.clearing', 'Clearing...')
          : t('settings.clearCache.button', 'Clear Cache')}
      </Button>
    </Stack>
  );
}

export default CacheSettings;
