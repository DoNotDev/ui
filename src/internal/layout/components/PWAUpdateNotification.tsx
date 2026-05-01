'use client';
// packages/ui/src/internal/layout/components/PWAUpdateNotification.tsx

/**
 * @fileoverview PWAUpdateNotification component
 * @description PWA update notification using toast system (industry standard)
 *
 * CSR/SSR Safe:
 * - Returns null on server (isClient() check)
 * - Guards all browser APIs
 * - Handles service worker rejection gracefully
 * - Uses toast system instead of Card component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { RefreshCw } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';

import { toast, Button, ToastAction } from '@donotdev/components';
import { isClient, useTranslation } from '@donotdev/core';

export interface PWAUpdateNotificationProps {
  onUpdate?: () => void;
}

/**
 * PWAUpdateNotification - PWA update notification using toast system
 *
 * Industry standard pattern:
 * - Detects service worker updates
 * - Shows persistent toast (duration: 0)
 * - Component returns null (toast handles UI)
 * - CSR/SSR safe with proper guards
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
function PWAUpdateNotification({ onUpdate }: PWAUpdateNotificationProps) {
  const { t } = useTranslation('dndev');
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const toastIdRef = useRef<string | null>(null);
  const isUpdatingRef = useRef(false);

  // CSR/SSR safe: Early return on server
  useEffect(() => {
    if (!isClient() || !('serviceWorker' in navigator)) return;

    let refreshing = false;

    const handleControllerChange = () => {
      if (refreshing || !isClient()) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange
    );

    // Track listeners for cleanup
    let currentReg: ServiceWorkerRegistration | null = null;
    let handleUpdateFound: (() => void) | null = null;
    let trackedWorker: ServiceWorker | null = null;
    let handleStateChange: (() => void) | null = null;

    const checkForUpdates = async () => {
      // CSR guard: Check client again
      if (!isClient()) return;

      try {
        const reg = await navigator.serviceWorker.ready;
        registrationRef.current = reg;
        currentReg = reg;

        handleUpdateFound = () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          trackedWorker = newWorker;
          handleStateChange = () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller &&
              !toastIdRef.current
            ) {
              showUpdateToast();
            }
          };

          newWorker.addEventListener('statechange', handleStateChange);
        };

        reg.addEventListener('updatefound', handleUpdateFound);

        if (reg.waiting && !toastIdRef.current) {
          showUpdateToast();
        }
      } catch (error) {
        // No service worker registered - silently return (industry standard)
        // Don't log warnings for missing service workers
        return;
      }
    };

    const showUpdateToast = () => {
      if (!isClient() || toastIdRef.current) return;

      const handleUpdate = async () => {
        if (
          !registrationRef.current?.waiting ||
          isUpdatingRef.current ||
          !isClient()
        )
          return;

        isUpdatingRef.current = true;
        if (onUpdate) {
          onUpdate();
        }

        registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
      };

      const { id } = toast({
        title: t('pwa.update.title', 'Update available'),
        description: t(
          'pwa.update.description',
          'A new version is ready. Refresh to update.'
        ),
        toastType: 'info',
        duration: 0, // Persistent (industry standard)
        action: (
          <ToastAction
            asChild
            altText={t('pwa.update.altText', 'Update application')}
          >
            <Button onClick={handleUpdate} icon={RefreshCw}>
              {t('pwa.update.button', 'Update')}
            </Button>
          </ToastAction>
        ),
      });

      toastIdRef.current = id;
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, 60000);

    return () => {
      if (isClient() && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener(
          'controllerchange',
          handleControllerChange
        );
      }
      if (currentReg && handleUpdateFound) {
        currentReg.removeEventListener('updatefound', handleUpdateFound);
      }
      if (trackedWorker && handleStateChange) {
        trackedWorker.removeEventListener('statechange', handleStateChange);
      }
      clearInterval(interval);
    };
  }, [onUpdate]);

  // Component doesn't render UI - toast handles it (industry standard)
  return null;
}

export default PWAUpdateNotification;
