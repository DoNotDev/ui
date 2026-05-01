'use client';
// packages/ui/src/internal/devtools/DebugTools.tsx

/**
 * @fileoverview DebugTools component
 * @description Development tools for debugging framework state
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { Bug, Trash2, X } from 'lucide-react';
import { Cookie } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  Button,
  BUTTON_VARIANT,
  Card,
  Label,
  Portal,
  PortalButton,
  cn,
  Stack,
} from '@donotdev/components';
import { useBreakpoint, useConsent } from '@donotdev/core';

import { DebugDialog } from './components/DebugDialog';

import type { MouseEvent } from 'react';

interface DebugToolsProps {
  className?: string;
}

const DebugTools = ({ className }: DebugToolsProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const hasConsented = useConsent('hasConsented');
  const showCookieBanner = useConsent('showCookieBanner');
  const reset = useConsent('reset');

  const current = useBreakpoint('current');
  const width = useBreakpoint('width');
  const height = useBreakpoint('height');

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: globalThis.MouseEvent) => {
      const newX = Math.max(
        0,
        Math.min(e.clientX - startPos.current.x, window.innerWidth - 300)
      );
      const newY = Math.max(
        0,
        Math.min(e.clientY - startPos.current.y, window.innerHeight - 200)
      );
      setPosition({ x: newX, y: newY });
    };

    const handleUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      // Get current position from element if not yet dragged
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const currentX = position?.x ?? rect.left;
      const currentY = position?.y ?? rect.top;

      setIsDragging(true);
      startPos.current = {
        x: e.clientX - currentX,
        y: e.clientY - currentY,
      };
    }
  };

  const toggleDebug = () => {
    const newValue = !debugEnabled;
    const value = newValue ? '1' : '0';
    document.documentElement.style.setProperty('--debug-enabled', value);
    if (newValue) {
      document.documentElement.setAttribute('data-debug', 'true');
    } else {
      document.documentElement.removeAttribute('data-debug');
    }
    setDebugEnabled(newValue);
  };

  // Don't render if hidden - use PortalButton for minimized state
  if (!isVisible) {
    return (
      <PortalButton
        onClick={() => setIsVisible(true)}
        className="dndev-z-overlay"
        style={{
          position: 'fixed',
          top: 'calc(var(--gap-lg) + var(--header-height))',
          insetInlineStart: 'calc(var(--gap-sm) + var(--sidebar-width))',
        }}
        icon={Bug}
        title="Show Debug Tools"
      />
    );
  }

  return (
    <Portal>
      <div
        className={cn('dndev-z-overlay drag-handle', className)}
        style={{
          position: 'fixed',
          insetInlineStart:
            position?.x ?? 'calc(var(--sidebar-width) + var(--gap-lg))',
          top: position?.y ?? 'calc(var(--header-height) + var(--gap-lg))',
          cursor: isDragging ? 'grabbing' : 'grab',
          minWidth: '20rem',
        }}
        onMouseDown={handleMouseDown}
      >
        <Card
          title={
            <Stack direction="row" align="center" justify="between">
              <DebugDialog />
              <Button
                onClick={() => setIsVisible(false)}
                icon={X}
                variant={BUTTON_VARIANT.GHOST}
                title="Hide Debug Tools"
              />
            </Stack>
          }
          content={
            <>
              <Stack
                direction="row"
                align="center"
                justify="center"
                gap="tight"
                wrap="wrap"
              >
                <Button
                  onClick={toggleDebug}
                  variant={
                    debugEnabled
                      ? BUTTON_VARIANT.DEFAULT
                      : BUTTON_VARIANT.OUTLINE
                  }
                  icon={Bug}
                  title={`Display Lines (${debugEnabled ? 'ON' : 'OFF'})`}
                >
                  Display Lines
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      // Reset consent (deletes cookie and resets store)
                      reset();
                      // Clear all storage
                      localStorage.clear();
                      sessionStorage.clear();
                      if ('caches' in window) {
                        const keys = await caches.keys();
                        await Promise.all(
                          keys.map((key) => caches.delete(key))
                        );
                      }
                      if ('indexedDB' in window && 'databases' in indexedDB) {
                        try {
                          const databases = await indexedDB.databases();
                          await Promise.all(
                            databases.map(
                              (db) =>
                                db.name && indexedDB.deleteDatabase(db.name)
                            )
                          );
                        } catch (dbError) {
                          console.error('Failed to clear IndexedDB:', dbError);
                        }
                      }
                      // Clear store registry (DEV mode: HMR preserves globalThis, prevents re-init)
                      if (
                        typeof globalThis !== 'undefined' &&
                        globalThis._DNDEV_STORES_
                      ) {
                        globalThis._DNDEV_STORES_ = {};
                      }
                      // ⚠️ Force hard reload (bypasses HMR cache)
                      window.location.reload();
                    } catch (error) {
                      console.error('Failed to clear cache:', error);
                    }
                  }}
                  variant={BUTTON_VARIANT.OUTLINE}
                  icon={Trash2}
                  title="Clear all Cache"
                >
                  Clear Cache
                </Button>
                <Button
                  onClick={() => {
                    if (hasConsented) {
                      showCookieBanner(); // ✅ Triggers store update → components re-render → banner appears
                    }
                  }}
                  variant={
                    hasConsented ? BUTTON_VARIANT.OUTLINE : BUTTON_VARIANT.GHOST
                  }
                  icon={Cookie}
                  title={
                    hasConsented
                      ? 'Reset consent (show banner)'
                      : 'Consent banner visible'
                  }
                >
                  {hasConsented
                    ? 'Show Cookie Banner'
                    : 'Cookie Banner Visible'}
                </Button>
              </Stack>
            </>
          }
          footer={
            <Stack
              align="center"
              justify="center"
              className={cn(
                'drag-handle',
                current === 'mobile' && 'dndev-text-destructive',
                current === 'tablet' && 'dndev-text-primary',
                current === 'laptop' && 'dndev-text-secondary-foreground',
                current === 'desktop' && 'dndev-text-muted-foreground'
              )}
              style={{
                cursor: 'grab',
              }}
            >
              <Label className="dndev-font-mono dndev-text-lg">
                {current.toUpperCase()} : {width} × {height}px
              </Label>
            </Stack>
          }
        />
      </div>
    </Portal>
  );
};

export default DebugTools;
