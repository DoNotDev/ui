// packages/ui/src/internal/layout/components/__tests__/AutoMetaTagsNotFound.test.tsx

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({ pathname: '/_not-found' }));

vi.mock('@donotdev/core', async () => {
  const languagePath = await import(
    '../../../../../../core/utils/src/common/languagePath'
  );
  // AutoMetaTags builds its tags with these (shared with the Vite prerender)
  const headTags = await import(
    '../../../../../../core/utils/src/common/headTags'
  );
  // The route matcher AutoMetaTags shares with crud
  const routeMatch = await import('../../../../../../core/utils/src/common/routeMatch');
  return {
    ...languagePath,
    ...headTags,
    ...routeMatch,
    getLanguageRouting: () => ({
      languages: ['fr', 'en'],
      defaultLanguage: 'fr',
    }),
    isNextJs: () => true,
    // Page titles / descriptions translate, so a namespace lookup shows in the output
    // No record shown (layout store routeRecordLabel)
    useLayout: () => null,
    useTranslation: () => ({
      t: (key: string) =>
        key === 'errors.notFound.title'
          ? 'Page non trouvée'
          : /:(title|description)$/.test(key)
            ? `T(${key})`
            : '',
    }),
    getDndevConfig: () => ({
      routes: { mapping: [], manifest: { hasBlogFeed: false } },
    }),
    useSeoConfig: () => ({ siteName: 'Shop' }),
    useAppConfig: () => ({ name: 'Shop' }),
    getPlatformEnvVar: () => 'https://shop.example',
    translateArray: () => [],
  };
});
vi.mock('@donotdev/ui/routing/hooks', () => ({
  useRoutePath: () => page.pathname,
  useUrlLanguage: () => 'fr',
}));
vi.mock('../HeadTags', () => ({
  HeadTags: ({ children }: { children: unknown }) => <>{children}</>,
}));

import { NotFoundDocument } from '../../../../routing/NotFoundDocument';
import { AutoMetaTags } from '../AutoMetaTags';

const renderAt = (pathname: string) => {
  page.pathname = pathname;
  return renderToStaticMarkup(
    <NotFoundDocument>
      <AutoMetaTags />
    </NotFoundDocument>
  );
};

// Regression: the static 404 is built at /_not-found and served at any URL; its
// URL-derived JSON-LD differed from the browser render (React #418 on apps/next).
describe('AutoMetaTags in the 404 document', () => {
  it('renders the same tags whatever the URL', () => {
    expect(renderAt('/does-not-exist')).toBe(renderAt('/_not-found'));
    expect(renderAt('/a/b')).toBe(renderAt('/_not-found'));
  });

  it('has no URL-derived tag, the 404 heading + site name as title', () => {
    const html = renderAt('/legal/unknown');
    expect(html).not.toMatch(
      /rel="canonical"|og:url|hrefLang|"@type":"WebPage"|BreadcrumbList/
    );
    expect(html).not.toContain('T(');
    expect(html).toContain('<title>Page non trouvée | Shop</title>');
    expect(html).toContain('<meta property="og:title" content="Page non trouvée | Shop"/>');
    expect(html).toContain('<meta property="og:site_name" content="Shop"/>');
  });

  it('outside it, the page keeps its canonical and JSON-LD', () => {
    page.pathname = '/legal/terms';
    const html = renderToStaticMarkup(<AutoMetaTags />);
    expect(html).toContain('rel="canonical" href="https://shop.example/legal/terms"');
    expect(html).toContain('"@type":"WebPage"');
    expect(html).toContain('BreadcrumbList');
  });
});
