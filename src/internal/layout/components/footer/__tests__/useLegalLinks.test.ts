import { describe, expect, it } from 'vitest';

import { getLegalLinks } from '../useLegalLinks';

describe('getLegalLinks', () => {
  it('hides the links when the app has no footer (footer: null)', () => {
    expect(getLegalLinks(null)).toEqual([]);
  });

  it('hides the links when they are explicitly null', () => {
    expect(getLegalLinks({ legalLinks: null })).toEqual([]);
  });

  it('uses the defaults when nothing is configured', () => {
    expect(getLegalLinks(undefined).length).toBeGreaterThan(0);
  });

  it('uses the configured links', () => {
    const links = [{ path: '/legal/terms', label: 'footer.legal.terms' }];
    expect(getLegalLinks({ legalLinks: links })).toEqual(links);
  });

  it('drops #cookie-settings from the defaults when no cookie notice is required', () => {
    const paths = getLegalLinks(undefined, false).map((l) => l.path);
    expect(paths).not.toContain('#cookie-settings');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('drops #cookie-settings from configured links when no cookie notice is required', () => {
    const links = [
      { path: '#cookie-settings', label: 'footer.legal.cookieSettings' },
      { path: '/legal/privacy', label: 'footer.legal.privacyPolicy' },
    ];
    expect(getLegalLinks({ legalLinks: links }, false)).toEqual([links[1]]);
    expect(getLegalLinks({ legalLinks: links }, true)).toEqual(links);
    expect(getLegalLinks({ legalLinks: links })).toEqual(links);
  });
});
