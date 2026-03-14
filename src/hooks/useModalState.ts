import { useState, useCallback } from 'react';

/**
 * Simple hook for managing a boolean open/closed state (modal, sheet, drawer, etc.)
 *
 * Returns a tuple of [isOpen, open, close, toggle]
 *
 * Usage:
 *   const [isOpen, openSheet, closeSheet, toggleSheet] = useModalState();
 *   const [showDialog, openDialog, closeDialog] = useModalState(true); // open by default
 */
export function useModalState(
  initialState = false
): [boolean, () => void, () => void, () => void] {
  const [isOpen, setIsOpen] = useState<boolean>(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return [isOpen, open, close, toggle];
}
