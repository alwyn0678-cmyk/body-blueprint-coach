import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the provided value that only updates
 * after the specified delay has elapsed without the value changing.
 *
 * Usage:
 *   const debouncedQuery = useDebounce(searchQuery, 500);
 *
 *   useEffect(() => {
 *     if (debouncedQuery) fetchResults(debouncedQuery);
 *   }, [debouncedQuery]);
 *
 * @param value  The value to debounce
 * @param delay  Debounce delay in milliseconds (default: 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
