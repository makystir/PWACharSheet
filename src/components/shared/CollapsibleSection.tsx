import { useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import styles from './CollapsibleSection.module.css';

interface CollapsibleSectionProps {
  title: string;
  storageKey: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}

/**
 * Read the expanded state from localStorage.
 * Returns undefined if not found or on error (graceful fallback).
 */
function readPersistedState(storageKey: string): boolean | undefined {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Write the expanded state to localStorage.
 * Silently swallows errors (quota exceeded, private browsing, etc.).
 */
function writePersistedState(storageKey: string, expanded: boolean): void {
  try {
    localStorage.setItem(storageKey, String(expanded));
  } catch {
    // Graceful fallback: continue with in-memory state only
  }
}

export function CollapsibleSection({
  title,
  storageKey,
  defaultExpanded = true,
  children,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState<boolean>(() => {
    const persisted = readPersistedState(storageKey);
    return persisted ?? defaultExpanded;
  });

  // Sync with storageKey changes (e.g., character switch)
  useEffect(() => {
    const persisted = readPersistedState(storageKey);
    setExpanded(persisted ?? defaultExpanded);
  }, [storageKey, defaultExpanded]);

  const toggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      writePersistedState(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.header}
        onClick={toggle}
        aria-expanded={expanded}
      >
        <span className={styles.title}>{title}</span>
        {expanded ? (
          <ChevronDown size={18} className={styles.chevron} aria-hidden="true" />
        ) : (
          <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
        )}
      </button>
      {expanded && <div className={styles.content}>{children}</div>}
    </div>
  );
}
