'use client';
// packages/ui/src/internal/devtools/components/ConfigTab.tsx

/**
 * @fileoverview Config Tab Component
 * @description Framework config and environment variables
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import {
  Card,
  DescriptionList,
  Text,
  Badge,
  BADGE_VARIANT,
  Stack,
} from '@donotdev/components';
import { getDndevConfig, getConfigSource } from '@donotdev/core';

import { MaskedValue } from './MaskedValue';

export const ConfigTab = () => {
  const config = getDndevConfig();
  const source = getConfigSource();
  const envVars = config?.env || {};

  if (!config) {
    return (
      <Card title="Config" subtitle="Not available">
        <Text className="dndev-text-muted-foreground">
          Config not loaded. Source: {source.source}
        </Text>
      </Card>
    );
  }

  const frameworkItems = [
    {
      label: 'Platform',
      value: <Badge variant={BADGE_VARIANT.SECONDARY}>{config.platform}</Badge>,
    },
    {
      label: 'Mode',
      value: (
        <Badge
          variant={
            config.mode === 'development'
              ? BADGE_VARIANT.DEFAULT
              : BADGE_VARIANT.SECONDARY
          }
        >
          {config.mode}
        </Badge>
      ),
    },
    {
      label: 'Version',
      value: (
        <Text className="dndev-font-mono dndev-text-sm">{config.version}</Text>
      ),
    },
  ];

  const summaryItems = [
    config.themes && {
      label: 'Themes',
      value: (
        <Text className="dndev-font-mono dndev-text-sm">
          {config.themes.discovered?.length || 0}
        </Text>
      ),
    },
    config.routes && {
      label: 'Routes',
      value: (
        <Text className="dndev-font-mono dndev-text-sm">
          {config.routes.mapping?.length || 0}
        </Text>
      ),
    },
    config.i18n && {
      label: 'Languages',
      value: (
        <Text className="dndev-font-mono dndev-text-sm">
          {config.i18n.languages?.join(', ')}
        </Text>
      ),
    },
    config.features && {
      label: 'Features',
      value: (
        <Text className="dndev-font-mono dndev-text-sm">
          {config.features.available?.length || 0}
        </Text>
      ),
    },
  ].filter(Boolean);

  const envItems = Object.entries(envVars).map(([key, value]) => ({
    label: <Text className="dndev-font-mono dndev-text-xs">{key}</Text>,
    value: <MaskedValue keyName={key} value={String(value)} />,
  }));

  return (
    <Stack style={{ padding: 'var(--gap-md)' }}>
      <Card title="Framework" subtitle={source.source}>
        <DescriptionList items={frameworkItems} />
      </Card>

      {summaryItems.length > 0 && (
        <Card title="Discovery">
          <DescriptionList items={summaryItems as any} />
        </Card>
      )}

      {envItems.length > 0 && (
        <Card title="Environment" subtitle={`${envItems.length} variables`}>
          <DescriptionList items={envItems as any} />
        </Card>
      )}
    </Stack>
  );
};
