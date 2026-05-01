'use client';
// packages/ui/src/routing/hooks/useLocation.vite.ts

/**
 * @fileoverview Vite-specific location hook
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { useLocation as useRouterLocation } from 'react-router-dom';

export function useLocation() {
  return useRouterLocation();
}
