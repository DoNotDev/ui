'use client';
// packages/ui/src/routing/hooks/useMatch.next.ts

import { usePathname } from 'next/navigation';

export function useMatch(pattern: string) {
  const pathname = usePathname();

  // Simple pattern matching for Next.js
  const regexPattern = pattern
    .replace(/:[^/]+/g, '([^/]+)') // Replace :param with regex group
    .replace(/\*/g, '.*'); // Replace * with .*

  const regex = new RegExp(`^${regexPattern}$`);
  const match = pathname.match(regex);

  if (!match) return null;

  // Extract params from the pattern
  const paramNames = pattern.match(/:[^/]+/g)?.map((p) => p.slice(1)) || [];
  const params: Record<string, string> = {};

  paramNames.forEach((name, index) => {
    params[name] = match[index + 1] || '';
  });

  return {
    params,
    pathname,
    pattern,
  };
}
