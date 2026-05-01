import { describe, it, expect } from 'vitest';

import {
  discoverEnvVarsByPattern,
  groupEnvVarsByCategory,
  findFirstEnvVarByPattern,
} from '../envVarDiscovery';

const sampleEnv = {
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_456',
  NEXT_PUBLIC_STRIPE_PRICE_ID: 'price_123',
  FIREBASE_PROJECT_ID: 'my-project',
  FIREBASE_API_KEY: 'AIzaSy...',
  VITE_SUPABASE_URL: 'https://abc.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  GOOGLE_CLIENT_ID: 'google-id',
  GITHUB_CLIENT_SECRET: 'github-secret',
  USE_EMULATOR: 'true',
  APP_NAME: 'TestApp',
  PORT: '3000',
};

describe('discoverEnvVarsByPattern', () => {
  it('matches wildcard patterns', () => {
    const result = discoverEnvVarsByPattern(sampleEnv, ['*STRIPE*']);

    expect(Object.keys(result)).toContain('STRIPE_SECRET_KEY');
    expect(Object.keys(result)).toContain('STRIPE_PUBLISHABLE_KEY');
    expect(Object.keys(result)).toContain('NEXT_PUBLIC_STRIPE_PRICE_ID');
  });

  it('matches multiple patterns', () => {
    const result = discoverEnvVarsByPattern(sampleEnv, [
      '*STRIPE*',
      '*FIREBASE*',
    ]);

    expect(Object.keys(result)).toContain('STRIPE_SECRET_KEY');
    expect(Object.keys(result)).toContain('FIREBASE_PROJECT_ID');
  });

  it('is case-insensitive', () => {
    const result = discoverEnvVarsByPattern(sampleEnv, ['*stripe*']);

    expect(Object.keys(result).length).toBeGreaterThan(0);
  });

  it('returns empty object for no matches', () => {
    const result = discoverEnvVarsByPattern(sampleEnv, ['*NONEXISTENT*']);

    expect(result).toEqual({});
  });

  it('matches substring without wildcards', () => {
    const result = discoverEnvVarsByPattern(sampleEnv, ['PORT']);

    expect(Object.keys(result)).toContain('PORT');
  });
});

describe('groupEnvVarsByCategory', () => {
  it('groups stripe vars', () => {
    const result = groupEnvVarsByCategory(sampleEnv);

    expect(result.stripe).toBeDefined();
    expect(result.stripe!['STRIPE_SECRET_KEY']).toBe('sk_test_123');
    expect(result.stripe!['NEXT_PUBLIC_STRIPE_PRICE_ID']).toBe('price_123');
  });

  it('groups firebase vars', () => {
    const result = groupEnvVarsByCategory(sampleEnv);

    expect(result.firebase).toBeDefined();
    expect(result.firebase!['FIREBASE_PROJECT_ID']).toBe('my-project');
  });

  it('groups supabase vars', () => {
    const result = groupEnvVarsByCategory(sampleEnv);

    expect(result.supabase).toBeDefined();
    expect(result.supabase!['VITE_SUPABASE_URL']).toBe(
      'https://abc.supabase.co'
    );
    expect(result.supabase!['VITE_SUPABASE_ANON_KEY']).toBe(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    );
  });

  it('groups oauth vars', () => {
    const result = groupEnvVarsByCategory(sampleEnv);

    expect(result.oauth).toBeDefined();
    expect(result.oauth!['GOOGLE_CLIENT_ID']).toBe('google-id');
    expect(result.oauth!['GITHUB_CLIENT_SECRET']).toBe('github-secret');
  });

  it('groups emulator vars', () => {
    const result = groupEnvVarsByCategory(sampleEnv);

    expect(result.emulator).toBeDefined();
    expect(result.emulator!['USE_EMULATOR']).toBe('true');
  });

  it('puts unmatched vars in other', () => {
    const result = groupEnvVarsByCategory(sampleEnv);

    expect(result.other).toBeDefined();
    expect(result.other!['APP_NAME']).toBe('TestApp');
    expect(result.other!['PORT']).toBe('3000');
  });

  it('omits empty categories', () => {
    const result = groupEnvVarsByCategory({ APP_NAME: 'Test' });

    expect(result.stripe).toBeUndefined();
    expect(result.firebase).toBeUndefined();
    expect(result.other).toBeDefined();
  });
});

describe('findFirstEnvVarByPattern', () => {
  it('returns first match value', () => {
    const result = findFirstEnvVarByPattern(sampleEnv, [
      '*NONEXIST*',
      '*FIREBASE_PROJECT*',
    ]);

    expect(result).toBe('my-project');
  });

  it('returns undefined for no matches', () => {
    const result = findFirstEnvVarByPattern(sampleEnv, ['*NOTHING*']);

    expect(result).toBeUndefined();
  });

  it('returns first pattern match (priority order)', () => {
    const result = findFirstEnvVarByPattern(sampleEnv, [
      '*STRIPE_SECRET*',
      '*STRIPE_PUBLISHABLE*',
    ]);

    expect(result).toBe('sk_test_123');
  });
});
