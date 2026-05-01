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
} from 'react';
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from 'react-hook-form';

import { Label, Slot, cn, Stack } from '@donotdev/components';

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
const FormItem = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  const id = useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <Stack className={className} {...(props as any)} />
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
 * Renders a label for a form field with error state styling.
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
      className={cn(error && 'text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  );
};

/**
 * Form control component
 *
 * Wraps form input components with proper ARIA attributes.
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
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
};

/**
 * Form description component
 *
 * Renders descriptive text for a form field.
 *
 * @param {HTMLAttributes<HTMLParagraphElement>} props - Component props
 * @returns {JSX.Element | null} Form description component
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const FormDescription = ({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) => {
  const formField = useFormField();
  if (!formField) return null;
  const { formDescriptionId } = formField;
  return (
    <p
      id={formDescriptionId}
      className={className}
      style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--muted-foreground)',
      }}
      {...props}
    />
  );
};

/**
 * Form message component
 *
 * Renders error or custom messages for a form field.
 *
 * @param {HTMLAttributes<HTMLParagraphElement>} props - Component props
 * @returns {JSX.Element | null} Form message component
 * @version 0.1.0
 * @since 0.0.1
 * @author AMBROISE PARK Consulting
 */
const FormMessage = ({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) => {
  const formField = useFormField();
  if (!formField) return null;
  const { error, formMessageId } = formField;
  const body = error ? String(error?.message) : children;
  if (!body) {
    return null;
  }
  return (
    <p
      id={formMessageId}
      className={className}
      style={{
        fontSize: 'var(--font-size-sm)',
        fontWeight: 500,
        color: 'var(--destructive)',
      }}
      {...props}
    >
      {body}
    </p>
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
