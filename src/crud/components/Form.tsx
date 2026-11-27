'use client';
// packages/ui/src/crud/components/Form.tsx

/**
 * @fileoverview Form Components
 * @description Form components built on react-hook-form and Radix UI primitives. Provides form context, field management, and validation support.
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */

import {
  createContext,
  useId,
  use,
  type HTMLAttributes,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';

import { FieldMessage, Label, Slot, Stack } from '@donotdev/components';

/**
 * Form provider component
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

/**
 * Form field context for sharing field name
 *
 * @type {React.Context<FormFieldContextValue>}
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const FormFieldContext = createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

/**
 * Form field component
 *
 * Wraps a form field with context and controller for react-hook-form integration.
 *
 * @param {ControllerProps<TFieldValues, TName>} props - Controller props
 * @returns {JSX.Element} Form field component
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

/**
 * Form item context for sharing item ID
 *
 * @type {React.Context<{ id: string }>}
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const FormItemContext = createContext<{ id: string }>({} as { id: string });

/**
 * Form item component
 *
 * Container component for form fields with spacing and layout.
 *
 * @param {HTMLAttributes<HTMLDivElement>} props - Component props
 * @returns {JSX.Element} Form item component
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const FormItem = ({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  const id = useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <Stack className={className} {...props}>
        {children}
      </Stack>
    </FormItemContext.Provider>
  );
};

/**
 * Hook for accessing form field context
 *
 * Returns form field state and IDs for form components.
 *
 * @returns {Object | null} Form field context with IDs and state
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const useFormField = () => {
  const fieldContext = use(FormFieldContext);
  if (!fieldContext || !fieldContext.name) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'useFormField must be used within <FormField> with a valid name'
      );
    }
    return null;
  }
  const itemContext = use(FormItemContext);
  if (!itemContext) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('useFormField must be used within <FormItem>');
    }
    return null;
  }
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

/**
 * Form label component
 *
 * Renders a label for a form field; in error it sets `data-state="error"` (Label.css: `--destructive` text).
 *
 * @param {ComponentProps<typeof Label>} props - Component props
 * @returns {JSX.Element | null} Form label component
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const FormLabel = ({ className, ...props }: ComponentProps<typeof Label>) => {
  const formField = useFormField();
  if (!formField) return null;
  const { error, formItemId } = formField;
  return (
    <Label
      className={className}
      data-state={error ? 'error' : undefined}
      htmlFor={formItemId}
      {...props}
    />
  );
};

/**
 * Form control component
 *
 * Wraps form input components with proper ARIA attributes: `aria-invalid` while the
 * field has an error, `aria-describedby` to the `FormMessage` slot then (the error), else
 * to the `FormDescription`.
 *
 * @param {ComponentProps<typeof Slot>} props - Component props
 * @returns {JSX.Element | null} Form control component
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const FormControl = ({ ...props }: ComponentProps<typeof Slot>) => {
  const formField = useFormField();
  if (!formField) return null;
  const { error, formItemId, formDescriptionId, formMessageId } = formField;
  return (
    <Slot
      id={formItemId}
      aria-describedby={error ? formMessageId : formDescriptionId}
      aria-invalid={error ? true : undefined}
      {...props}
    />
  );
};

/**
 * Form description component
 *
 * Helper text under the field (`FieldMessage` from `@donotdev/components`). Hidden while
 * the field has an error: the error replaces it (shown by `FormMessage`).
 *
 * @param {{ children?: ReactNode; className?: string }} props - Component props
 * @returns {JSX.Element | null} Form description component
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const FormDescription = ({
  className,
  children,
}: {
  children?: ReactNode;
  className?: string;
}) => {
  const formField = useFormField();
  if (!formField || formField.error) return null;
  return (
    <FieldMessage
      id={formField.formDescriptionId}
      helperText={children}
      className={className}
    />
  );
};

/**
 * Form message component
 *
 * The field's message slot (`FieldMessage` from `@donotdev/components`): the validation
 * error (icon + text, announced: polite live region mounted before it), else `children`
 * as helper text, else nothing (no blank line).
 *
 * @param {{ children?: ReactNode; className?: string }} props - Component props
 * @returns {JSX.Element | null} Form message component
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const FormMessage = ({
  className,
  children,
}: {
  children?: ReactNode;
  className?: string;
}) => {
  const formField = useFormField();
  if (!formField) return null;
  const { error, formMessageId } = formField;
  return (
    <FieldMessage
      id={formMessageId}
      error={error?.message}
      helperText={children}
      className={className}
    />
  );
};

/**
 * Form component exports
 *
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  useFormField,
};
