// packages/ui/src/utils/useCrudSafe.ts

/**
 * @fileoverview Safe useCrud wrapper for graceful degradation
 * @description Provides CRUD functionality when @donotdev/crud is installed,
 * gracefully degrades to no-op when not installed. This is the recommended
 * way to use CRUD in optional/plugin contexts.
 *
 * ## CRITICAL: DO NOT USE DYNAMIC IMPORTS
 *
 * This file MUST use sync `import * as crudModule from '@donotdev/crud'`
 * at module level. DO NOT refactor to use async `import('@donotdev/crud').then(...)`.
 *
 * ### Why sync import is required:
 *
 * 1. **Bundler aliasing**: Vite/webpack alias missing packages to empty modules
 *    at BUILD TIME. The import completes immediately (no async).
 *
 * 2. **Rules of Hooks**: If we use async dynamic import:
 *    - First render: `realUseCrud = null` → uses stub (0 hooks)
 *    - Async completes: `realUseCrud = useCrud` → now has hooks
 *    - Next render: React sees different hook count → CRASH
 *
 * 3. **Monorepo gotcha**: Dynamic imports resolve workspace packages even when
 *    the consuming app doesn't have them as dependencies. This causes the
 *    real hook to activate unexpectedly → Rules of Hooks violation.
 *
 * 4. **Decision is immutable**: With sync import, `crudModule?.useCrud`
 *    is evaluated ONCE at module load. It's either the real hook or undefined.
 *    This never changes during the app lifecycle.
 *
 * @see docs/development/GRACEFUL_DEGRADATION.md
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import { DEGRADED_CRUD_API } from '@donotdev/core';
import type { CrudAPI, dndevSchema, Entity } from '@donotdev/core';
import * as crudModule from '@donotdev/crud';

interface UseCrudSafeOptions<T> {
  schema?: dndevSchema<T>;
  entity?: Entity;
  staleTime?: number;
  noCache?: boolean;
}

// Check if real hook exists (will be undefined if Vite aliased to empty module)
const realUseCrud = crudModule?.useCrud as
  | (<T>(
      entityOrCollection: Entity | string,
      options?: UseCrudSafeOptions<T>
    ) => CrudAPI<T>)
  | undefined;

/**
 * Stub that returns degraded CRUD values.
 * Used when @donotdev/crud is not installed.
 */
function useCrudStub<T = unknown>(): CrudAPI<T> {
  return DEGRADED_CRUD_API as CrudAPI<T>;
}

/**
 * Safe wrapper for useCrud hook.
 *
 * - If @donotdev/crud installed → uses real hook (handles Firebase/consent internally)
 * - If not installed → returns degraded API values
 *
 * @param entityOrCollection - Entity definition or collection name
 * @param options - Options including backend type and schema
 * @returns CRUD operations and state, or degraded API if crud unavailable
 *
 * @example
 * ```typescript
 * // With entity
 * const { add, update } = useCrudSafe(carEntity);
 *
 * // With collection string
 * const { get, set } = useCrudSafe('users', { schema: UserSchema });
 * ```
 */
export function useCrudSafe<T = unknown>(
  entityOrCollection: Entity | string,
  options: UseCrudSafeOptions<T> = {}
): CrudAPI<T> {
  if (realUseCrud) {
    return realUseCrud<T>(entityOrCollection, options);
  }
  return useCrudStub<T>();
}

/**
 * Check if CRUD module is available (for conditional UI rendering)
 */
export const isCrudAvailable = typeof realUseCrud === 'function';
