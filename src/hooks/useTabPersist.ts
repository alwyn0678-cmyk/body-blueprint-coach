import { useState } from 'react';

/**
 * Like useState but persists the value in sessionStorage so navigating
 * away and back to the same page restores the last selected tab.
 */
export function useTabPersist<T extends string>(
  key: string,
  defaultValue: T,
): [T, (v: T) => void] {
  const storageKey = `bbc_tab_${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      return (saved as T) || defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setAndPersist = (v: T) => {
    setValue(v);
    try {
      sessionStorage.setItem(storageKey, v);
    } catch {
      // sessionStorage unavailable — degrade gracefully
    }
  };

  return [value, setAndPersist];
}
