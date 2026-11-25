// packages/ui/src/internal/providers/__tests__/UIProvidersLocale.test.tsx

/**
 * @fileoverview UIProviders mounts the component locale
 * @description `@donotdev/components` labels and formatting come from the i18n
 * language and the `dndev` namespace (`useTranslation('dndev')`: the request language
 * during the server render and the hydration pass), so a hand-built DataTable in an
 * app is translated with no label prop, on the server render too.
 */

import { renderToString } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { DataTable, useComponentLocale } from '@donotdev/components';

import fr from '../../../../../core/i18n/locales/eager/dndev_fr.json';

type Messages = { [key: string]: string | Messages };

/** `t` of the `dndev` namespace in French: dotted lookup, `{{name}}` filled. */
const translateFr = (key: string, values?: Record<string, unknown>) => {
  const text = key
    .split('.')
    .reduce<string | Messages | undefined>(
      (node, part) =>
        node && typeof node === 'object' ? node[part] : undefined,
      fr as Messages
    );
  if (typeof text !== 'string') return key;
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    values && name in values ? String(values[name]) : match
  );
};

const namespaces = vi.hoisted(() => ({ asked: [] as unknown[] }));

vi.mock('@donotdev/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useTranslation: (namespace: unknown) => {
    namespaces.asked.push(namespace);
    return { t: translateFr, language: 'fr', i18n: null };
  },
}));
vi.mock('@donotdev/ui/routing/hooks', () => ({
  useNavigate: () => () => {},
  useRoutePath: () => '/',
}));
vi.mock('../../../crud/crudImports', () => ({
  FormNavigationProvider: ({ children }: { children: unknown }) => children,
  isCrudModuleAvailable: false,
}));

import { UIProviders } from '../UIProviders';

function LocaleProbe() {
  const { language, timeZone, translate } = useComponentLocale();
  return (
    <output data-language={language} data-time-zone={timeZone}>
      {translate('table.export')}
    </output>
  );
}

// The app's time zone (i18n.timeZone), registered by the generated i18n config
const previousConfig = globalThis._DNDEV_CONFIG_;
beforeAll(() => {
  // why: only the i18n key getAppTimeZone reads
  globalThis._DNDEV_CONFIG_ = { i18n: { timeZone: 'Europe/Paris' } } as unknown as typeof globalThis._DNDEV_CONFIG_;
});
afterAll(() => {
  globalThis._DNDEV_CONFIG_ = previousConfig;
});

describe('UIProviders component locale', () => {
  it('provides the app time zone to components (getAppTimeZone)', () => {
    const html = renderToString(
      <UIProviders>
        <LocaleProbe />
      </UIProviders>
    );
    expect(html).toContain('data-time-zone="Europe/Paris"');
  });

  it('fails loud without a time zone (no machine-zone fallback)', () => {
    globalThis._DNDEV_CONFIG_ = undefined;
    try {
      expect(() => renderToString(<UIProviders>{null}</UIProviders>)).toThrow(
        /i18n\.timeZone/
      );
    } finally {
      globalThis._DNDEV_CONFIG_ = { i18n: { timeZone: 'Europe/Paris' } } as unknown as typeof globalThis._DNDEV_CONFIG_;
    }
  });

  it('provides the i18n language and the dndev translation to components', () => {
    const html = renderToString(
      <UIProviders>
        <LocaleProbe />
      </UIProviders>
    );
    expect(namespaces.asked).toContain('dndev');
    expect(html).toContain('data-language="fr"');
    expect(html).toContain('>Exporter<');
  });

  it('translates a hand-built DataTable with no label prop (server render)', () => {
    const html = renderToString(
      <UIProviders>
        <DataTable
          data={[
            { id: 'a', name: 'A' },
            { id: 'b', name: 'B' },
          ]}
          columns={[{ key: 'name', title: 'Nom', dataIndex: 'name' }]}
          selectable
          exportable
        />
      </UIProviders>
    );
    expect(html).toContain('aria-label="Sélectionner toutes les lignes"');
    expect(html).toContain('placeholder="Rechercher..."');
    expect(html).toContain('Exporter');
  });
});
