'use client';
// packages/ui/src/routing/hooks/useParams.next.ts

import { useParams as useNextParams } from 'next/navigation';

export function useParams(): Record<string, string | string[] | undefined> {
  const params = useNextParams();
  if (!params) return {};
  return params as Record<string, string | string[] | undefined>;
}
