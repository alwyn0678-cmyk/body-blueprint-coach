import { useState, useCallback } from 'react';

/**
 * Hook for a single controlled form field with optional validation.
 *
 * Returns [value, setValue, error, validate, reset]
 *
 * Usage:
 *   const [email, setEmail, emailError, validateEmail, resetEmail] = useFormField(
 *     '',
 *     (v) => v.includes('@') ? null : 'Enter a valid email'
 *   );
 *
 * @param initialValue  Starting value for the field
 * @param validator     Optional function: receives the current value, returns an error
 *                      string or null if valid. When omitted the field always validates.
 */
export function useFormField(
  initialValue: string,
  validator?: (value: string) => string | null
): [
  value: string,
  setValue: (v: string) => void,
  error: string | null,
  validate: () => boolean,
  reset: () => void
] {
  const [value, setValueRaw] = useState<string>(initialValue);
  const [error, setError] = useState<string | null>(null);

  /**
   * Updates the field value and clears any existing error so the UI
   * doesn't show stale validation state while the user is typing.
   */
  const setValue = useCallback((v: string) => {
    setValueRaw(v);
    setError(null);
  }, []);

  /**
   * Runs the validator against the current value, stores the result,
   * and returns true if the value is valid (no error).
   */
  const validate = useCallback((): boolean => {
    if (!validator) return true;
    const result = validator(value);
    setError(result);
    return result === null;
  }, [value, validator]);

  /**
   * Resets the field to its initial value and clears any error.
   */
  const reset = useCallback(() => {
    setValueRaw(initialValue);
    setError(null);
  }, [initialValue]);

  return [value, setValue, error, validate, reset];
}
