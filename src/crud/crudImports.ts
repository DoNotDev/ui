// packages/ui/src/crud/crudImports.ts

/**
 * @fileoverview Safe import hub for @donotdev/crud
 * @description Single module-level import using the proven `import * as` pattern.
 * When crud is not installed, Vite aliases it to an empty module — all extractions
 * resolve to `undefined`. This is immutable: the decision is made once at module load.
 *
 * Components import from here instead of directly from '@donotdev/crud'.
 * Type-only imports (`import type`) can still go directly to '@donotdev/crud'.
 *
 * @see useCrudSafe.ts — same pattern, proven in production
 * @version 0.1.0
 * @since 0.0.25
 * @author AMBROISE PARK Consulting
 */

import * as crudModule from '@donotdev/crud';

/** true when @donotdev/crud resolved with real exports */
export const isCrudModuleAvailable = typeof crudModule?.useCrud === 'function';

// --- Hooks ---
export const useEntityForm = crudModule?.useEntityForm;
export const useFormStore = crudModule?.useFormStore;
export const useFieldConditions = crudModule?.useFieldConditions;
export const useCrud = crudModule?.useCrud;
export const useCrudList = crudModule?.useCrudList;
export const useCrudCardList = crudModule?.useCrudCardList;
export const useEntityFavorites = crudModule?.useEntityFavorites;
export const useCrudFilters = crudModule?.useCrudFilters;
export const useCrudPageSize = crudModule?.useCrudPageSize;
export const useEntityWorkflow = crudModule?.useEntityWorkflow;
export const useReferenceResolver = crudModule?.useReferenceResolver;

// --- Components ---
export const DisplayFieldRenderer = crudModule?.DisplayFieldRenderer;
export const FormFieldRenderer = crudModule?.FormFieldRenderer;
export const UploadProvider = crudModule?.UploadProvider;
export const EntityFilters = crudModule?.EntityFilters;
export const CrudCard = crudModule?.CrudCard;

// --- Utils ---
export const translateFieldLabel = crudModule?.translateFieldLabel;
export const formatValue = crudModule?.formatValue;
