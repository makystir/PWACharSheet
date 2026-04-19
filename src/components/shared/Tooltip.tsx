import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  anchorEl: HTMLElement;
  title: string;
  children: ReactNode;
  onClose: () => void;
  id: string;
}

function computePosition(anchorEl: HTMLElement): { top: number; left: number } {
  const rect = anchorEl.getBoundingClientRect();
  const margin = 8;
  const gap = 6;
  const tooltipEstWidth = 280;
  const tooltipEstHeight = 200;

  // Vertical: prefer below, flip above if not enough space
  let top: number;
  const spaceBelow = window.innerHeight - rect.bottom;
  if (spaceBelow >= tooltipEstHeight + gap) {
    top = rect.bottom + gap;
  } else {
    top = rect.top - tooltipEstHeight - gap;
    if (top < margin) top = margin;
  }

  // Horizontal: center on anchor, clamp to viewport
  let left = rect.left + rect.width / 2 - tooltipEstWidth / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - tooltipEstWidth - margin));

  return { top, left };
}

export function Tooltip({ anchorEl, title, children, onClose, id }: TooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Compute position on mount and when anchor changes
  useEffect(() => {
    setPosition(computePosition(anchorEl));
  }, [anchorEl]);

  // Auto-focus on mount
  useEffect(() => {
    tooltipRef.current?.focus();
  }, []);

  // Dismiss on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  // Dismiss on mousedown outside
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [handleKeyDown, handleMouseDown]);

  return createPortal(
    <div
      ref={tooltipRef}
      id={id}
      role="tooltip"
      tabIndex={-1}
      className={styles.tooltip}
      style={{ top: position.top, left: position.left }}
    >
      <div className={styles.title}>{title}</div>
      <div className={styles.body}>{children}</div>
    </div>,
    document.body,
  );
}
