import { useState, useEffect, useCallback } from 'react';
import { onStorageError } from '../storage/local-storage';
import type { StorageErrorReason } from '../storage/local-storage';

const MESSAGES: Record<StorageErrorReason, string> = {
  'quota-exceeded': 'Save failed — storage is full. Free up space in Settings.',
  'unavailable': 'Cannot save — storage is unavailable in this browsing mode.',
};

/**
 * Hook that subscribes to storage write errors and exposes a toast message.
 * Renders independently from existing undo/confirmation toasts.
 */
export function useStorageErrorToast(): { message: string | null; clearMessage: () => void } {
  const [message, setMessage] = useState<string | null>(null);

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  useEffect(() => {
    const unsubscribe = onStorageError((reason: StorageErrorReason) => {
      setMessage(MESSAGES[reason]);
    });
    return unsubscribe;
  }, []);

  return { message, clearMessage };
}
