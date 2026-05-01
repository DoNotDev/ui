'use client';
// packages/ui/src/internal/devtools/components/DebugDialog.tsx

/**
 * @fileoverview Debug Dialog Component
 * @description Clean debug panel - Config, Design, Cookies, Stores
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { PanelRight } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  BUTTON_VARIANT,
  Sheet,
  Tabs,
  Stack,
  ScrollArea,
} from '@donotdev/components';
import { useTranslation } from '@donotdev/core';

import { ConfigTab } from './ConfigTab';
import { CookieTab } from './CookieTab';
import { DesignTab } from './DesignTab';
import { StoresTab } from './StoresTab';

export const DebugDialog = () => {
  const { t } = useTranslation('dndev');
  const [open, setOpen] = useState(false);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          icon={PanelRight}
          iconEnd
          variant={BUTTON_VARIANT.OUTLINE}
          className="dndev-flex-1 dndev-justify-center dndev-items-center"
          title="Open debug panel"
          aria-label="Debug panel"
        >
          🐛 Debug Tools
        </Button>
      }
      side="top"
      showOverlay={false}
      title={t('sheet.debugPanel', { defaultValue: 'Debug Panel' })}
      className="dndev-h-[80vh] dndev-max-h-[80vh]"
      data-dndev-devtools="true"
    >
      <Stack
        flex="1"
        className="dndev-h-full dndev-min-h-0"
        style={{ padding: 0, overflow: 'hidden', height: '100%' }}
      >
        <Tabs
          defaultValue="config"
          className="dndev-flex-1 dndev-min-h-0 dndev-flex dndev-flex-col dndev-h-full"
          items={[
            {
              value: 'config',
              label: 'Config',
              content: (
                <ScrollArea className="dndev-h-full" style={{ height: '100%' }}>
                  <ConfigTab />
                </ScrollArea>
              ),
            },
            {
              value: 'design',
              label: 'Design',
              content: (
                <ScrollArea className="dndev-h-full" style={{ height: '100%' }}>
                  <DesignTab />
                </ScrollArea>
              ),
            },
            {
              value: 'cookies',
              label: 'Cookies',
              content: (
                <ScrollArea className="dndev-h-full" style={{ height: '100%' }}>
                  <CookieTab />
                </ScrollArea>
              ),
            },
            {
              value: 'stores',
              label: 'Stores',
              content: (
                <ScrollArea className="dndev-h-full" style={{ height: '100%' }}>
                  <StoresTab />
                </ScrollArea>
              ),
            },
          ]}
          listClassName="dndev-flex dndev-flex-row dndev-gap-sm"
          listStyle={{
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'transparent',
          }}
        />
      </Stack>
    </Sheet>
  );
};
