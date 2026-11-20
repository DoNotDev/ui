// packages/ui/src/components/cookie-consent/__tests__/ConsentBanner.test.tsx

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  requiredCookies: ['necessary'] as string[] | undefined,
}));

vi.mock('@donotdev/core', async () => {
  const mapping = await import(
    '../../../../../core/utils/src/client/cookies/cookieMapping'
  );
  return {
    isCookieNoticeRequired: mapping.isCookieNoticeRequired,
    useAppConfig: () => ({ features: { requiredCookies: state.requiredCookies } }),
    useConsent: (key: string) => (key === 'hasConsented' ? false : false),
  };
});
vi.mock('../../../../../core/utils/src/client/features/featureDetection', () => ({
  isFeatureAvailable: () => false,
}));
// `lazy` suspends under static rendering: resolve it synchronously to the banner stub
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  lazy: () => () => <div>banner</div>,
}));

import { ConsentBanner } from '../ConsentBanner';
import { useCookieNoticeRequired } from '../useCookieNoticeRequired';

const Probe = () => <span>{String(useCookieNoticeRequired())}</span>;

describe('cookie notice', () => {
  beforeEach(() => {
    state.requiredCookies = ['necessary'];
  });

  it('renders no banner when only strictly necessary cookies are set', () => {
    expect(renderToStaticMarkup(<ConsentBanner />)).toBe('');
    state.requiredCookies = undefined;
    expect(renderToStaticMarkup(<ConsentBanner />)).toBe('');
  });

  it('keeps the banner when a non-necessary category is configured', () => {
    state.requiredCookies = ['necessary', 'analytics'];
    expect(renderToStaticMarkup(<ConsentBanner />)).toContain('banner');
  });

  it('useCookieNoticeRequired follows the configured categories', () => {
    expect(renderToStaticMarkup(<Probe />)).toContain('false');
    state.requiredCookies = ['necessary', 'marketing'];
    expect(renderToStaticMarkup(<Probe />)).toContain('true');
  });
});
