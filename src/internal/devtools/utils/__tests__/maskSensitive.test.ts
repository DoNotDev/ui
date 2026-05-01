import { describe, it, expect } from 'vitest';

import {
  maskSensitiveValue,
  maskSensitiveData,
  shouldMaskValue,
} from '../maskSensitive';

describe('maskSensitiveValue', () => {
  it('masks long values (shows first 4 + last 4)', () => {
    expect(maskSensitiveValue('sk_live_1234567890abcdef')).toBe('sk_l***cdef');
  });

  it('fully masks short values (<= 8 chars)', () => {
    expect(maskSensitiveValue('short')).toBe('***');
    expect(maskSensitiveValue('12345678')).toBe('***');
  });

  it('fully masks empty string', () => {
    expect(maskSensitiveValue('')).toBe('***');
  });

  it('masks 9-char value (boundary)', () => {
    expect(maskSensitiveValue('123456789')).toBe('1234***6789');
  });
});

describe('maskSensitiveData', () => {
  it('masks keys containing SECRET', () => {
    const result = maskSensitiveData({
      CLIENT_SECRET: 'super_secret_value_here',
      PUBLIC_NAME: 'MyApp',
    });

    expect(result.CLIENT_SECRET).toBe('supe***here');
    expect(result.PUBLIC_NAME).toBe('MyApp');
  });

  it('masks keys containing KEY, TOKEN, PASSWORD', () => {
    const result = maskSensitiveData({
      API_KEY: 'AIzaSyB1234567890abcdef',
      ACCESS_TOKEN: 'ya29.a0AfH6SMB1234567890',
      DB_PASSWORD: 'MySecurePassword123',
      APP_NAME: 'DoNotDev',
    });

    expect(result.API_KEY).toContain('***');
    expect(result.ACCESS_TOKEN).toContain('***');
    expect(result.DB_PASSWORD).toContain('***');
    expect(result.APP_NAME).toBe('DoNotDev');
  });

  it('does not mask non-string values (converts to string)', () => {
    const result = maskSensitiveData({
      API_KEY: 12345 as any,
      COUNT: 42,
    });

    // Non-string sensitive values are stringified, not masked
    expect(result.API_KEY).toBe('12345');
    expect(result.COUNT).toBe('42');
  });

  it('does not mask empty sensitive values', () => {
    const result = maskSensitiveData({
      API_KEY: '',
    });

    expect(result.API_KEY).toBe('');
  });

  it('handles case-insensitive key detection', () => {
    const result = maskSensitiveData({
      api_key: 'long_value_that_gets_masked',
      Api_Secret: 'another_secret_value_here',
    });

    expect(result.api_key).toContain('***');
    expect(result.Api_Secret).toContain('***');
  });
});

describe('shouldMaskValue', () => {
  it('returns true for sensitive keys with non-empty values', () => {
    expect(shouldMaskValue('API_KEY', 'some-key')).toBe(true);
    expect(shouldMaskValue('secret_token', 'abc')).toBe(true);
    expect(shouldMaskValue('DATABASE_URL', 'postgres://...')).toBe(true);
  });

  it('returns false for non-sensitive keys', () => {
    expect(shouldMaskValue('APP_NAME', 'MyApp')).toBe(false);
    expect(shouldMaskValue('PORT', '3000')).toBe(false);
  });

  it('returns false for sensitive keys with empty values', () => {
    expect(shouldMaskValue('API_KEY', '')).toBe(false);
  });
});
