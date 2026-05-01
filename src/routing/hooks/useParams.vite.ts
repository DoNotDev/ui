'use client';
// packages/ui/src/routing/hooks/useParams.vite.ts

import { useParams as useRouterParams } from 'react-router-dom';

export function useParams(): Record<string, string | string[] | undefined> {
  return useRouterParams();
}
