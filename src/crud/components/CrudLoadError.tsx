'use client';
// packages/ui/src/crud/components/CrudLoadError.tsx

/**
 * @fileoverview Load error of a CRUD read
 * @description The one error state of a failed read, for an EntityList, a list joined
 * to a parent form (child rows) and a detail view (EntityDisplayRenderer): translated
 * title `crud:errors.fetchFailed`, a translated reason from the error code
 * (`loadErrorReasonKey`, `@donotdev/core`: `dndev:messages.*`), and a retry. The error's own message never shows on screen
 * (internals stay internal, and it is not translated): it goes to the console.
 *
 * @version 0.1.0
 * @since 0.3.8
 * @author AMBROISE PARK Consulting
 */

import { useEffect } from 'react';

import { Alert, Button, Stack } from '@donotdev/components';
import { loadErrorReasonKey, useTranslation } from '@donotdev/core';

/** Props of {@link CrudLoadError}. */
export interface CrudLoadErrorProps {
  /** The read's error: its code picks the reason; the error itself goes to the console */
  error: unknown;
  /** What failed to load, translated (the entity's plural name for a list, its name for a record) */
  entity: string;
  /** Read again (`useCrudList` / `useChildRows` / `useCrudDoc` `refresh`) */
  onRetry: () => unknown;
}

/**
 * Error state of a failed CRUD read: "Could not load products", the reason, Retry.
 *
 * @example
 * ```tsx
 * {error && <CrudLoadError error={error} entity={names} onRetry={refresh} />}
 * ```
 *
 * @version 0.1.0
 * @since 0.3.8
 */
export function CrudLoadError({ error, entity, onRetry }: CrudLoadErrorProps) {
  // dndev (eager, every locale): reasons and the retry label; crud: the title
  const { t } = useTranslation('dndev');
  const { t: tCrud } = useTranslation('crud');
  useEffect(() => {
    console.error(`[crud] Could not load ${entity}:`, error);
  }, [error, entity]);
  return (
    <Alert
      variant="error"
      title={tCrud('errors.fetchFailed', { entity })}
      description={t(loadErrorReasonKey(error))}
    >
      <Stack direction="row">
        <Button
          intent="reload"
          variant="outline"
          display="full"
          onClick={() => void onRetry()}
        >
          {t('routeError.tryAgain')}
        </Button>
      </Stack>
    </Alert>
  );
}
