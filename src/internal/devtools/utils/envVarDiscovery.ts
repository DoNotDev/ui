// packages/ui/src/internal/devtools/utils/envVarDiscovery.ts

/**
 * @fileoverview Environment variable discovery utilities
 * @description Generic utilities for discovering environment variables by pattern matching
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

/**
 * Match environment variable key against pattern (case-insensitive)
 * Supports wildcard patterns: *KEY*, *STRIPE*, etc.
 */
function matchesPattern(key: string, pattern: string): boolean {
  const normalizedKey = key.toUpperCase();
  const normalizedPattern = pattern.toUpperCase();

  if (normalizedPattern.includes('*') || normalizedPattern.includes('?')) {
    // Escape regex metacharacters before converting wildcards
    const escaped = normalizedPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexPattern = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(normalizedKey);
  }

  return normalizedKey.includes(normalizedPattern);
}

/**
 * Discover environment variables by pattern matching
 *
 * @param env - Environment variables object
 * @param patterns - Array of patterns to match (e.g., ['*STRIPE*', '*KEY*'])
 * @returns Object with matched env vars
 */
export function discoverEnvVarsByPattern(
  env: Record<string, string>,
  patterns: string[]
): Record<string, string> {
  const result: Record<string, string> = {};

  Object.entries(env).forEach(([key, value]) => {
    const matches = patterns.some((pattern) => matchesPattern(key, pattern));
    if (matches) {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Group environment variables by category based on common patterns
 *
 * @param env - Environment variables object
 * @returns Grouped env vars by category
 */
export function groupEnvVarsByCategory(env: Record<string, string>): {
  stripe?: Record<string, string>;
  firebase?: Record<string, string>;
  supabase?: Record<string, string>;
  oauth?: Record<string, string>;
  emulator?: Record<string, string>;
  other?: Record<string, string>;
} {
  const result: {
    stripe?: Record<string, string>;
    firebase?: Record<string, string>;
    supabase?: Record<string, string>;
    oauth?: Record<string, string>;
    emulator?: Record<string, string>;
    other?: Record<string, string>;
  } = {};

  Object.entries(env).forEach(([key, value]) => {
    if (
      matchesPattern(key, '*STRIPE*') ||
      matchesPattern(key, '*PRICE*ID*') ||
      matchesPattern(key, '*PRICE_ID*')
    ) {
      if (!result.stripe) result.stripe = {};
      result.stripe[key] = value;
    } else if (matchesPattern(key, '*FIREBASE*')) {
      if (!result.firebase) result.firebase = {};
      result.firebase[key] = value;
    } else if (matchesPattern(key, '*SUPABASE*')) {
      if (!result.supabase) result.supabase = {};
      result.supabase[key] = value;
    } else if (
      matchesPattern(key, '*OAUTH*') ||
      matchesPattern(key, '*GOOGLE*CLIENT*') ||
      matchesPattern(key, '*GITHUB*CLIENT*') ||
      matchesPattern(key, '*AUTH*PARTNER*')
    ) {
      if (!result.oauth) result.oauth = {};
      result.oauth[key] = value;
    } else if (
      matchesPattern(key, '*EMULATOR*') ||
      matchesPattern(key, '*USE*EMULATOR*')
    ) {
      if (!result.emulator) result.emulator = {};
      result.emulator[key] = value;
    } else {
      if (!result.other) result.other = {};
      result.other[key] = value;
    }
  });

  return result;
}

/**
 * Find first environment variable matching pattern
 *
 * @param env - Environment variables object
 * @param patterns - Array of patterns to try (returns first match)
 * @returns First matching value or undefined
 */
export function findFirstEnvVarByPattern(
  env: Record<string, string>,
  patterns: string[]
): string | undefined {
  for (const pattern of patterns) {
    const matches = discoverEnvVarsByPattern(env, [pattern]);
    const firstMatch = Object.values(matches)[0];
    if (firstMatch) return firstMatch;
  }
  return undefined;
}
