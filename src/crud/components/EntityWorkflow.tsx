'use client';
// packages/ui/src/crud/components/EntityWorkflow.tsx

/**
 * @fileoverview EntityWorkflow component
 * @description Renders a multi-step entity workflow with stepper navigation.
 * Uses useEntityWorkflow for orchestration and EntityFormRenderer for each step's form.
 *
 * @example
 * ```tsx
 * <EntityWorkflow
 *   workflow={onboardingWorkflow}
 *   onComplete={async (data) => {
 *     await api.createAccount(data);
 *     navigate('/dashboard');
 *   }}
 * />
 * ```
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import type { ReactNode } from 'react';

import { Button, Stack, Stepper } from '@donotdev/components';
import { useTranslation } from '@donotdev/core';
import type {
  WorkflowConfig,
  UseEntityWorkflowOptions,
  EntityWorkflowReturn,
} from '@donotdev/crud';

import { isCrudModuleAvailable, useEntityWorkflow } from '../crudImports';
import { EntityFormRenderer } from './EntityFormRenderer';

/** Props for EntityWorkflow */
export interface EntityWorkflowProps {
  /** Workflow configuration from defineWorkflow() */
  workflow: WorkflowConfig;
  /** Callback when all steps are completed */
  onComplete?: (allData: Record<string, unknown>) => void | Promise<void>;
  /** Callback when step changes */
  onStepChange?: (fromIndex: number, toIndex: number) => void;
  /** Default values to pre-fill across steps */
  defaultValues?: Record<string, unknown>;
  /** Viewer role for form rendering */
  viewerRole?: string;
  /** Render prop for custom layout (receives workflow state) */
  children?: (wf: EntityWorkflowReturn) => ReactNode;
  /** Additional CSS class */
  className?: string;
}

/**
 * EntityWorkflow — renders a multi-step entity workflow.
 *
 * Default mode: auto-renders Stepper + form + navigation buttons.
 * Custom mode: pass a render prop as children for full control.
 */
export function EntityWorkflow({
  workflow: config,
  onComplete,
  onStepChange,
  defaultValues,
  viewerRole,
  children,
  className,
}: EntityWorkflowProps) {
  // Safe guard: isCrudModuleAvailable is a module-level constant (immutable after load).

  if (!isCrudModuleAvailable) return null;

  const { t } = useTranslation('crud');

  const wf = useEntityWorkflow(config, {
    onComplete,
    onStepChange,
    defaultValues,
  });

  // Custom render mode
  if (children) {
    return <>{children(wf)}</>;
  }

  const {
    currentStep,
    currentStepIndex,
    visibleSteps,
    isFirst,
    isLast,
    isSubmitting,
    stepData,
  } = wf;

  // Build stepper steps (for the Stepper header)
  const stepperSteps = visibleSteps.map((step, index) => ({
    number: index + 1,
    title: step.title,
    content: null as ReactNode, // Content is rendered separately below
  }));

  return (
    <Stack className={className} gap="large">
      {/* Stepper navigation header */}
      <Stepper
        steps={stepperSteps}
        activeStep={currentStepIndex}
        showStepNumbers
        onStepChange={(index) => {
          // Only allow navigating to completed steps (not jumping forward)
          if (index <= currentStepIndex) {
            wf.goToStep(index);
          }
        }}
      />

      {/* Current step content */}
      {currentStep.custom ? (
        // Custom render step (e.g., review/summary)
        currentStep.custom(wf.allData)
      ) : currentStep.entity ? (
        // Entity form step
        <EntityFormRenderer
          entity={currentStep.entity}
          operation="create"
          viewerRole={viewerRole}
          defaultValues={{
            ...stepData[currentStep.id],
            ...(!isLast && { status: 'draft' }),
          }}
          onSubmit={async (data) => {
            await wf.goNext(data as Record<string, unknown>);
          }}
          submitText={
            isLast
              ? t('workflow.submit', { defaultValue: 'Submit' })
              : t('workflow.next', { defaultValue: 'Next' })
          }
          cancelText={
            isFirst
              ? null
              : t('workflow.previous', { defaultValue: 'Previous' })
          }
          onCancel={isFirst ? undefined : wf.goPrevious}
          loading={isSubmitting}
          hideVisibilityInfo
        />
      ) : null}

      {/* Skip button (only if step allows it) */}
      {currentStep.allowSkip && !isLast && (
        <Button variant="ghost" onClick={wf.skipStep} className="dndev-w-full">
          {t('workflow.skip', { defaultValue: 'Skip this step' })}
        </Button>
      )}
    </Stack>
  );
}
