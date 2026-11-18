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
});
