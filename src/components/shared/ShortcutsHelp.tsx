import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { SHORTCUT_GROUPS } from '../../config/shortcuts';
import styles from './ShortcutsHelp.module.css';

export interface ShortcutsHelpProps {
  onClose: () => void;
}

/**
 * Keyboard-shortcut reference overlay (Req 14.1–14.3).
 *
 * The list is generated from `config/shortcuts.ts`, which is the single source
 * of truth derived from the actual handlers (page number keys 1–7 from
 * `NAV_ITEMS`, plus Ctrl/⌘+K search and Ctrl/⌘+Z undo). It is reachable via a
 * visible affordance (command palette footer + navigation help button) so users
 * never need to know a hidden combination to discover the shortcuts.
 */
export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Dismiss on Escape.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus the panel on mount for keyboard users.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return createPortal(
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        ref={panelRef}
        className={styles.panel}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Keyboard Shortcuts</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.groups}>
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title} className={styles.group}>
              <h3 className={styles.groupTitle}>{group.title}</h3>
              <dl className={styles.list}>
                {group.shortcuts.map((shortcut) => (
                  <div key={`${group.title}-${shortcut.keys}`} className={styles.row}>
                    <dt className={styles.keys}>
                      <kbd className={styles.kbd}>{shortcut.keys}</kbd>
                    </dt>
                    <dd className={styles.description}>{shortcut.description}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
