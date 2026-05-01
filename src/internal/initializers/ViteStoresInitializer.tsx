// packages/ui/src/internal/initializers/ViteStoresInitializer.tsx

/**
 * @fileoverview Vite stores initializer
 * @description Vite-specific store initialization wrapper
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { isTest } from '@donotdev/core';
import type { CustomStoreConfig } from '@donotdev/core';

import {
  BaseStoresInitializer,
  type StoreHandlers,
} from './BaseStoresInitializer';

import type { ReactNode } from 'react';

interface ViteStoresInitializerProps {
  children: ReactNode;
  customStores?: CustomStoreConfig[];
  skipStoreInit?: boolean;
}

const VITE_HANDLERS: StoreHandlers = {
  platform: 'Vite',
};

/**
 * ViteStoresInitializer - Vite platform store initializer
 *
 * Wraps BaseStoresInitializer with Vite-specific handlers.
 * Automatically skips initialization in test environments.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export function ViteStoresInitializer({
  children,
  customStores,
  skipStoreInit,
}: ViteStoresInitializerProps) {
  const skip = skipStoreInit ?? isTest();

  return (
    <BaseStoresInitializer
      handlers={VITE_HANDLERS}
      customStores={customStores}
      skipStoreInit={skip}
    >
      {children}
    </BaseStoresInitializer>
  );
}
