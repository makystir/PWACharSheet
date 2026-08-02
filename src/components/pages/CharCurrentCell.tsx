import { useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { CharacteristicKey } from '../../types/character';
import styles from './CharCurrentCell.module.css';

export interface CharCurrentCellProps {
  charKey: CharacteristicKey;
  current: number;
  isTooltipOpen: boolean;
  onOpen: (key: CharacteristicKey, anchorEl: HTMLElement) => void;
  onClose: () => void;
}

export function CharCurrentCell({
  charKey,
  current,
  isTooltipOpen,
  onOpen,
  onClose,
}: CharCurrentCellProps) {
  const hoverOpenTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverOpenTimeout.current) clearTimeout(hoverOpenTimeout.current);
      if (hoverCloseTimeout.current) clearTimeout(hoverCloseTimeout.current);
    };
  }, []);

  const clearHoverTimeouts = useCallback(() => {
    if (hoverOpenTimeout.current) {
      clearTimeout(hoverOpenTimeout.current);
      hoverOpenTimeout.current = null;
    }
    if (hoverCloseTimeout.current) {
      clearTimeout(hoverCloseTimeout.current);
      hoverCloseTimeout.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      // Cancel hover timeout to prevent double-open on hybrid devices
      clearHoverTimeouts();
      onOpen(charKey, e.currentTarget);
    },
    [charKey, onOpen, clearHoverTimeouts],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen(charKey, e.currentTarget);
      }
    },
    [charKey, onOpen],
  );

  const handleMouseEnter = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      // Clear any pending close timeout
      if (hoverCloseTimeout.current) {
        clearTimeout(hoverCloseTimeout.current);
        hoverCloseTimeout.current = null;
      }
      // Start 300ms open delay
      hoverOpenTimeout.current = setTimeout(() => {
        hoverOpenTimeout.current = null;
        onOpen(charKey, target);
      }, 300);
    },
    [charKey, onOpen],
  );

  const handleMouseLeave = useCallback(() => {
    // Clear any pending open timeout
    if (hoverOpenTimeout.current) {
      clearTimeout(hoverOpenTimeout.current);
      hoverOpenTimeout.current = null;
    }
    // Start 200ms close delay
    hoverCloseTimeout.current = setTimeout(() => {
      hoverCloseTimeout.current = null;
      onClose();
    }, 200);
  }, [onClose]);

  return (
    <div
      className={styles.cell}
      tabIndex={0}
      role="button"
      aria-describedby={isTooltipOpen ? `tooltip-char-${charKey}` : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {current}
    </div>
  );
}
