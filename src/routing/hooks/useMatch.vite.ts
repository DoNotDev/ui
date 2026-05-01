'use client';
// packages/ui/src/routing/hooks/useMatch.vite.ts

import { useMatch as useRouterMatch } from 'react-router-dom';

export function useMatch(pattern: string) {
  return useRouterMatch(pattern);
}
