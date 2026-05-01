// packages/ui/src/crud/components/index.ts

/**
 * @fileoverview CRUD components
 * @description CRUD components with routing support (moved from @donotdev/crud)
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

export { EntityDisplayRenderer } from './EntityDisplayRenderer';
export { EntityList } from './EntityList';
export { EntityCardList } from './EntityCardList';
export { EntityFormRenderer } from './EntityFormRenderer';
export { EntityRecommendations } from './EntityRecommendations';
export { EntityWorkflow } from './EntityWorkflow';
export type { EntityWorkflowProps } from './EntityWorkflow';
export * from './Form';

export type {
  EntityListProps,
  EntityCardListProps,
  EntityRecommendationsProps,
  EntityFormRendererProps,
  EntityDisplayRendererProps,
} from '@donotdev/core';
