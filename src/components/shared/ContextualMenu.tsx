import { useEffect, useRef, useState, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';

import styles from './ContextualMenu.module.css';

export interface ContextualMenuItem {
  label: string;
  icon?: LucideIcon;
  onAction: () => void;
  destructive?: boolean;
}

export interface ContextualMenuProps {
  x: number;
  y: number;
  items: ContextualMenuItem[];
  onDismiss: () => void;
}

/**
 * A contextual popup menu positioned at touch coordinates.
 * Dismisses on outside click/tap, Escape key, or back gesture (popstate).
 * Provides subtle haptic feedback on mount via the Vibration API.
 */
export function ContextualMenu({ x, y, items, onDismiss }: ContextualMenuProps) {
  const menuRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: y, left: x });

  // Measure menu on mount and clamp to viewport bounds
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const menuWidth = rect.width;
    const menuHeight = rect.height;

    const clampedLeft = Math.min(x, window.innerWidth - menuWidth);
    const clampedTop = Math.min(y, window.innerHeight - menuHeight);

    setPosition({
      left: Math.max(0, clampedLeft),
      top: Math.max(0, clampedTop),
    });
  }, [x, y]);

  // Haptic feedback on mount
  useEffect(() => {
    navigator.vibrate?.(10);
  }, []);

  // Dismiss on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    },
    [onDismiss]
  );

  // Dismiss on popstate (back gesture)
  useEffect(() => {
    const handlePopState = () => {
      onDismiss();
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleKeyDown, onDismiss]);

  // Focus the menu on mount for keyboard accessibility
  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  return (
    <>
      {/* Invisible backdrop to capture outside clicks */}
      <div
        className={styles.backdrop}
        onClick={onDismiss}
        onTouchStart={onDismiss}
        aria-hidden="true"
      />
      <ul
        ref={menuRef}
        className={styles.menu}
        role="menu"
        aria-label="Context menu"
        tabIndex={-1}
        style={{ top: position.top, left: position.left }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className={`${styles.menuItem}${item.destructive ? ` ${styles.menuItemDestructive}` : ''}`}
                onClick={() => {
                  item.onAction();
                  onDismiss();
                }}
              >
                {Icon && <Icon className={styles.menuItemIcon} size={18} aria-hidden="true" />}
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
