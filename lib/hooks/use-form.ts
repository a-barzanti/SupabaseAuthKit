import { useState } from 'react';

interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void> | void;
  validate?: (values: T) => string | null;
}

interface UseFormReturn<T> {
  values: T;
  errors: string | null;
  isLoading: boolean;
  handleChange: (field: keyof T) => (value: T[keyof T]) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setValues: (values: T | ((prev: T) => T)) => void;
  setErrors: (error: string | null) => void;
  reset: () => void;
}

/**
 * Custom hook for form state management
 */
export function useForm<T extends object>({
  initialValues,
  onSubmit,
  validate,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: keyof T) => (value: T[keyof T]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors) {
      setErrors(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors(null);

    // Validate form if validation function provided
    if (validate) {
      const validationError = validate(values);
      if (validationError) {
        setErrors(validationError);
        setIsLoading(false);
        return;
      }
    }

    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setValues(initialValues);
    setErrors(null);
    setIsLoading(false);
  };

  return {
    values,
    errors,
    isLoading,
    handleChange,
    handleSubmit,
    setValues,
    setErrors,
    reset,
  };
}
