// packages/ui/src/internal/devtools/utils/maskSensitive.ts

/**
 * @fileoverview Sensitive Data Masking Utilities
 * @description Utilities to mask sensitive values in devtools to prevent exposing real data
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

/**
 * Check if a key name indicates sensitive data
 */
function isSensitiveKey(key: string): boolean {
  const upperKey = key.toUpperCase();
  return (
    upperKey.includes('SECRET') ||
    upperKey.includes('KEY') ||
    upperKey.includes('TOKEN') ||
    upperKey.includes('PASSWORD') ||
    upperKey.includes('PRIVATE') ||
    upperKey.includes('API_KEY') ||
    upperKey.includes('CLIENT_SECRET') ||
    upperKey.includes('ACCESS_TOKEN') ||
    upperKey.includes('REFRESH_TOKEN') ||
    upperKey.includes('DATABASE_URL') ||
    upperKey.includes('CONNECTION_STRING')
  );
}

/**
 * Mask a sensitive value
 * Shows first 4 chars and last 4 chars with *** in between
 */
export function maskSensitiveValue(value: string): string {
  if (!value || value.length <= 8) {
    return '***';
  }
  const start = value.substring(0, 4);
  const end = value.substring(value.length - 4);
  return `${start}***${end}`;
}

/**
 * Mask sensitive values in an object based on key names
 */
export function maskSensitiveData<T extends Record<string, any>>(
  data: T
): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key) && typeof value === 'string' && value.length > 0) {
      masked[key] = maskSensitiveValue(value);
    } else {
      masked[key] = String(value);
    }
  }
  return masked;
}

/**
 * Check if value should be masked (for display purposes)
 */
export function shouldMaskValue(key: string, value: string): boolean {
  return isSensitiveKey(key) && value.length > 0;
}
