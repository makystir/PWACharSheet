import { useState, useEffect, useRef, useCallback } from 'react';
import { getPortraitStore } from '../storage/portrait-store';

/**
 * Manages a character portrait stored in IndexedDB (NOT localStorage, which
 * cannot hold large image blobs).
 *
 * Responsibilities bundled here so CharacterPage doesn't have to:
 *  - Load the portrait object URL for the active character on mount / id change.
 *  - Upload a new portrait file and swap in its object URL.
 *  - Remove the portrait.
 *  - Revoke stale `blob:` object URLs on change and on unmount to avoid leaks.
 *
 * `portraitURLRef` mirrors the latest URL so the unmount-cleanup effect can
 * revoke it without depending on the state value.
 */
export interface UsePortraitResult {
  /** Current object URL for the portrait, or '' when none. */
  portraitURL: string;
  /** User-facing error from the last upload/remove attempt, or null. */
  portraitError: string | null;
  /** Save the given file as this character's portrait and show it. */
  uploadPortrait: (file: File) => Promise<void>;
  /** Delete this character's portrait. */
  removePortrait: () => Promise<void>;
}

export function usePortrait(characterId: string): UsePortraitResult {
  const [portraitURL, setPortraitURL] = useState<string>('');
  const [portraitError, setPortraitError] = useState<string | null>(null);
  const portraitURLRef = useRef<string>(portraitURL);

  // Keep ref in sync with state for cleanup.
  useEffect(() => {
    portraitURLRef.current = portraitURL;
  }, [portraitURL]);

  // Load portrait URL from IndexedDB when characterId changes or on mount.
  useEffect(() => {
    let cancelled = false;
    const store = getPortraitStore();
    store.getPortraitURL(characterId).then((result) => {
      if (cancelled) return;
      if (result.ok && result.value) {
        setPortraitURL(result.value);
      } else {
        setPortraitURL('');
      }
    });
    return () => { cancelled = true; };
  }, [characterId]);

  // Object URL cleanup on unmount or when the portrait changes.
  useEffect(() => {
    return () => {
      if (portraitURLRef.current && portraitURLRef.current.startsWith('blob:')) {
        getPortraitStore().revokeURL(portraitURLRef.current);
      }
    };
  }, [portraitURL]);

  const uploadPortrait = useCallback(async (file: File) => {
    setPortraitError(null);
    const store = getPortraitStore();
    const result = await store.savePortrait(characterId, file);
    if (!result.ok) {
      setPortraitError('Portrait could not be saved.');
      return;
    }
    // Revoke old object URL if it was a blob URL.
    if (portraitURLRef.current && portraitURLRef.current.startsWith('blob:')) {
      store.revokeURL(portraitURLRef.current);
    }
    // Get new object URL.
    const urlResult = await store.getPortraitURL(characterId);
    if (urlResult.ok && urlResult.value) {
      setPortraitURL(urlResult.value);
    }
  }, [characterId]);

  const removePortrait = useCallback(async () => {
    setPortraitError(null);
    const store = getPortraitStore();
    const result = await store.deletePortrait(characterId);
    if (!result.ok) {
      setPortraitError('Portrait could not be removed.');
      return;
    }
    // Revoke old object URL if it was a blob URL.
    if (portraitURLRef.current && portraitURLRef.current.startsWith('blob:')) {
      store.revokeURL(portraitURLRef.current);
    }
    setPortraitURL('');
  }, [characterId]);

  return { portraitURL, portraitError, uploadPortrait, removePortrait };
}
