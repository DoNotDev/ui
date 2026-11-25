import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nDiscovery } from '../../../../core/config/discovery/I18nDiscovery.js';
import { PathResolver } from '../../../../core/config/utils/PathResolver.js';
import en from '../../../../core/i18n/locales/eager/dndev_en.json';
import fr from '../../../../core/i18n/locales/eager/dndev_fr.json';
import NotFoundPage from '../404';

const state = vi.hoisted(() => ({
  pathname: '/_not-found',
  navigate: vi.fn(),
  instance: null as ReturnType<typeof createInstance> | null,
}));
vi.mock('../../../../core/i18n/src/instance.vite', () => ({
  getI18nInstance: () => state.instance,
}));
vi.mock('../../../../core/i18n/src/utils/config', () => ({
  getEagerNamespaces: () => ['dndev'],
}));
// Exercise the real SSR-aware framework hook and real i18next nested references.
vi.mock('@donotdev/core', async () => ({
  ...await import('../../../../core/i18n/src/hooks/useTranslation'),
  useConsent: () => vi.fn(),
  useAppConfig: () => ({}),
  isCookieNoticeRequired: () => false,
}));
vi.mock('@donotdev/ui/routing/hooks', () => ({
  useRoutePath: () => state.pathname,
  useNavigate: () => state.navigate,
  useLocalizedPath: () => (path: string) => path,
}));
vi.mock('../useNavigation', () => ({
  useNavigationItems: () => [
    { path: '/', label: 'Home' },
    { path: '/catalogue', label: 'Catalogue' },
    { path: '/product/:id', label: 'Dynamic' },
  ],
}));

const locales = import.meta.glob<typeof fr>(
  '../../../../core/i18n/locales/eager/dndev_*.json',
  { eager: true, import: 'default' }
);
// Use the production discovery merge rather than a test-only approximation.
const discovery = new I18nDiscovery(PathResolver.getInstance());
async function initialize(content: object = fr, language = 'fr') {
  const instance = createInstance();
  await instance.init({
    lng: language, fallbackLng: 'en', ns: ['dndev'], defaultNS: 'dndev',
    resources: { [language]: { dndev: content }, en: { dndev: en } },
    interpolation: { escapeValue: false },
  });
  state.instance = instance;
  return instance;
}
beforeEach(async () => {
  state.pathname = '/_not-found';
  state.navigate.mockClear();
  await initialize();
});
afterEach(cleanup);

it('preserves the default pathname API and functional Home/Back/suggestion actions', () => {
  render(<NotFoundPage />);
  expect(document.querySelector('code')?.textContent).toBe('/_not-found');
  expect(screen.getByRole('link', { name: "Retour à l'accueil" }).getAttribute('href')).toBe('/');
  expect(screen.getByRole('link', { name: 'Catalogue' }).getAttribute('href')).toBe('/catalogue');
  expect(screen.getByRole('button', { name: 'Aller à Catalogue' })).not.toBeNull();
  fireEvent.click(screen.getByRole('link', { name: 'Catalogue' }));
  expect(state.navigate).toHaveBeenCalledWith('/catalogue', { replace: true });
  expect(screen.queryByText('Dynamic')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
  expect(state.navigate).toHaveBeenCalledWith('back');
});

// Regression (shop review): no <h1>; the route suggestions (after hydration) were above
// the Home / Back actions and pushed them down when they appeared.
it('has the title as its one h1 and the route suggestions after the Home / Back actions', () => {
  render(<NotFoundPage showRequestedPath={false} />);
  const headings = screen.getAllByRole('heading', { level: 1 });
  expect(headings.map((heading) => heading.textContent)).toEqual(['Page non trouvée']);
  const home = screen.getByRole('link', { name: "Retour à l'accueil" });
  const suggestion = screen.getByRole('link', { name: 'Catalogue' });
  expect(home.compareDocumentPosition(suggestion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it.each(['/missing', '/another/unknown', '/fr/inconnu'])('hydrates generic fallback at %s without the build pathname', async (pathname) => {
  const html = renderToString(<NotFoundPage showRequestedPath={false} />);
  expect(html).not.toContain('<code');
  expect(html).not.toContain('/_not-found');
  expect(html).toContain('Page non trouvée');
  expect(html).toContain('Vous cherchez peut-être');
  expect(html).toContain('Aller à Catalogue');
  expect(html).toContain('Retour à l');
  state.pathname = pathname;
  expect(renderToString(<NotFoundPage showRequestedPath={false} />)).toBe(html);
  const container = document.createElement('div');
  container.innerHTML = html;
  // DOM parsing normalizes entities (e.g. apostrophes) before React hydrates.
  const parsedHtml = container.innerHTML;
  document.body.append(container);
  const errors: unknown[] = [];
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(container, <NotFoundPage showRequestedPath={false} />, {
        onRecoverableError: (error) => errors.push(error),
      });
    });
    expect(errors).toEqual([]);
    expect(container.innerHTML).toBe(parsedHtml);
    expect(container.querySelector('code')).toBeNull();
    expect(container.querySelector('a[href="/catalogue"]')).not.toBeNull();
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});

describe('translation compatibility', () => {
  it.each(Object.entries(locales))('resolves one-hop aliases from %s', async (_file, locale) => {
    const instance = await initialize(locale);
    for (const key of ['title', 'description', 'suggestions', 'navigateTo', 'goHome', 'goBack']) {
      expect(instance.t(`errors.notFound.${key}`, { label: 'Catalogue' }))
        .toBe(instance.t(`messages.notFound.${key}`, { label: 'Catalogue' }));
      expect(instance.t(`errors.notFound.${key}`, { label: 'Catalogue' })).not.toMatch(/\$t\(|notFound\./);
    }
  });

  it.each([
    [{ messages: { notFound: { title: 'Titre canonique' } } }, 'Titre canonique'],
    [{ errors: { notFound: { title: 'Titre historique' } } }, 'Titre historique'],
    [{ messages: { notFound: { title: 'Canonique' } }, errors: { notFound: { title: 'Historique prioritaire' } } }, 'Historique prioritaire'],
  ])('preserves consumer field override precedence: %j', async (overrides, expected) => {
    await initialize(discovery._mergeTranslations(fr, overrides));
    const html = renderToString(<NotFoundPage showRequestedPath={false} />);
    expect(html).toContain(expected);
    expect(html).toContain('Aller à Catalogue');
    expect(html).not.toContain('Page Not Found');
  });

  it('uses the English locale when French resources are absent', async () => {
    await initialize({});
    const html = renderToString(<NotFoundPage showRequestedPath={false} />);
    expect(html).toContain('Page Not Found');
    expect(html).toContain('Navigate to Catalogue');
    expect(html).not.toContain('errors.notFound');
  });

  it('honors canonical accessibility overrides and legacy interpolation precedence', async () => {
    const canonical = discovery._mergeTranslations(fr, {
      messages: { notFound: { navigateTo: 'Voir {{label}}', goHome: 'Accueil personnalisé' } },
    });
    await initialize(canonical);
    expect(renderToString(<NotFoundPage />)).toContain('aria-label="Voir Catalogue"');
    expect(renderToString(<NotFoundPage />)).toContain('aria-label="Accueil personnalisé"');
    await initialize(discovery._mergeTranslations(canonical, {
      errors: { notFound: { navigateTo: 'Ouvrir {{label}}' } },
    }));
    expect(renderToString(<NotFoundPage />)).toContain('aria-label="Ouvrir Catalogue"');
  });

  it('keeps English defaults when neither resource family exists', async () => {
    await initialize({}, 'en');
    const html = renderToString(<NotFoundPage showRequestedPath={false} />);
    expect(html).toContain('Page Not Found');
    expect(html).toContain('Navigate to Catalogue');
    expect(html).toContain('Go Home');
    expect(html).not.toContain('errors.notFound');
  });
});
