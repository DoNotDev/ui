'use client';
// packages/ui/src/internal/devtools/components/LayoutReset.tsx

/**
 * @fileoverview Layout Reset Component
 * @description Comprehensive cache and store reset component for testing first-visit scenarios
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Trash2 } from 'lucide-react';
import { memo, useState, useCallback } from 'react';
import type { ComponentType } from 'react';

import { cn, Stack } from '@donotdev/components';
import { isClient } from '@donotdev/core';

export const LayoutReset: ComponentType = memo(() => {
  const [isResetting, setIsResetting] = useState(false);

  const resetLayout = useCallback(async () => {
    if (isResetting) return;
    if (!isClient()) return; // SSR guard
    if (process.env.NODE_ENV !== 'development') return; // DevTools only

    setIsResetting(true);

    try {
      // Clear all caches and stores (comprehensive reset)
      console.log('🔄 Clearing all caches and stores...');
      const clearedItems: string[] = [];
      const errors: string[] = [];

      // Clear localStorage (includes all Zustand persisted stores)
      try {
        localStorage.clear();
        clearedItems.push('localStorage');
        console.log('✅ Cleared localStorage');
      } catch (err) {
        console.error('Failed to clear localStorage:', err);
        errors.push('localStorage');
      }

      // Clear sessionStorage
      try {
        sessionStorage.clear();
        clearedItems.push('sessionStorage');
        console.log('✅ Cleared sessionStorage');
      } catch (err) {
        console.error('Failed to clear sessionStorage:', err);
        errors.push('sessionStorage');
      }

      // Clear IndexedDB
      if ('indexedDB' in window) {
        try {
          if ('databases' in indexedDB) {
            const databases = await indexedDB.databases();
            console.log(`📦 Found ${databases.length} IndexedDB databases`);

            // Wait for all deletions to complete
            await Promise.all(
              databases.map(async (db) => {
                if (db.name) {
                  console.log(` Deleting database: ${db.name}`);
                  const deleteReq = indexedDB.deleteDatabase(db.name);
                  await new Promise((resolve, reject) => {
                    deleteReq.onsuccess = () => {
                      console.log(` ✅ Deleted: ${db.name}`);
                      resolve(undefined);
                    };
                    deleteReq.onerror = () => reject(deleteReq.error);
                    deleteReq.onblocked = () => {
                      console.warn(` ⚠️ Blocked: ${db.name}`);
                      // Resolve anyway - it will be deleted when unblocked
                      resolve(undefined);
                    };
                  });
                }
              })
            );
            clearedItems.push(`IndexedDB (${databases.length} databases)`);
          } else {
            // Fallback for browsers without databases() API
            clearedItems.push('IndexedDB');
          }
        } catch (err) {
          console.error('Failed to clear IndexedDB:', err);
          errors.push('IndexedDB');
        }
      }

      // Clear application cache if available
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          console.log(`🗄️ Found ${keys.length} application caches`);

          await Promise.all(
            keys.map(async (key) => {
              try {
                await caches.delete(key);
                console.log(` ✅ Deleted cache: ${key}`);
              } catch (err) {
                console.error(` Failed to delete cache ${key}:`, err);
              }
            })
          );
          clearedItems.push(`Application Cache (${keys.length} caches)`);
        } catch (err) {
          console.error('Failed to clear application cache:', err);
          errors.push('Application Cache');
        }
      }

      // Clear service workers if available
      if ('serviceWorker' in navigator) {
        try {
          const registrations =
            await navigator.serviceWorker.getRegistrations();
          console.log(`⚙️ Found ${registrations.length} service workers`);

          await Promise.all(
            registrations.map(async (reg) => {
              try {
                await reg.unregister();
                console.log(` ✅ Unregistered service worker`);
              } catch (err) {
                console.error(' Failed to unregister service worker:', err);
              }
            })
          );
          clearedItems.push(`Service Workers (${registrations.length})`);
        } catch (err) {
          console.error('Failed to clear service workers:', err);
          errors.push('Service Workers');
        }
      }

      // Clear cookies
      try {
        const cookieCount = document.cookie.split(';').length;
        document.cookie.split(';').forEach((cookie) => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.slice(0, eqPos) : cookie;
          document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
        });
        clearedItems.push(`Cookies (${cookieCount})`);
        console.log('✅ Cleared cookies');
      } catch (err) {
        console.error('Failed to clear cookies:', err);
        errors.push('Cookies');
      }

      // Force garbage collection if available
      try {
        if ('gc' in window && typeof globalThis.gc === 'function') {
          globalThis.gc();
          clearedItems.push('Memory Cache');
          console.log('✅ Forced garbage collection');
        }
      } catch (err) {
        console.error('Failed to clear memory cache:', err);
      }

      // Show comprehensive feedback
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Cache reset complete!');
      console.log(`Cleared: ${clearedItems.join(', ')}`);
      if (errors.length > 0) {
        console.log(`⚠️ Errors: ${errors.join(', ')}`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Check if we actually cleared anything
      const success = clearedItems.length > 0;

      if (success) {
        // Reload immediately - console already has all the details
        if (isClient()) {
          window.location.reload();
        }
      } else {
        // Nothing was cleared
        console.warn(
          '⚠️ Nothing to clear or all operations failed. Check console for details.'
        );
        setIsResetting(false);
      }
    } catch (error) {
      console.error('❌ Failed to reset caches:', error);
      setIsResetting(false);
    }
  }, [isResetting]);

  return (
    <Stack
      as="button"
      align="center"
      justify="center"
      onClick={resetLayout}
      aria-disabled={isResetting}
      style={{
        width: 'var(--touch-target)',
        height: 'var(--touch-target)',
        borderRadius: 'var(--radius-lg)',
        transition: 'var(--transition-fast)',
        cursor: isResetting ? 'not-allowed' : 'pointer',
        ...(isResetting
          ? {
              backgroundColor: 'rgb(from var(--warning) r g b / 0.2)',
              color: 'var(--warning)',
            }
          : {
              color: 'var(--muted-foreground)',
            }),
      }}
      onMouseEnter={(e) => {
        if (!isResetting) {
          e.currentTarget.style.backgroundColor = 'var(--accent)';
          e.currentTarget.style.color = 'var(--accent-foreground)';
          e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isResetting) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--muted-foreground)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      title={
        isResetting
          ? 'Clearing...'
          : 'Clear all caches & stores (test first-visit)'
      }
      aria-label="Clear all caches and stores"
    >
      <Trash2
        style={{ width: '1.5rem', height: '1.5rem' }}
        className={cn(isResetting && 'dndev-animate-pulse')}
      />
    </Stack>
  );
});
