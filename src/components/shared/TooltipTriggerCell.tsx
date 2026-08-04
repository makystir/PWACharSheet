import { useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import styles from './TooltipTriggerCell.module.css';

export interface TooltipTriggerCellProps {
  /** Unique identifier used for the tooltip id and aria-describedby */
  tooltipId: string;
  /** Display value shown in the cell */
  displayValue: string | number;
  /** Whether this cell's tooltip is currently open */
  isTooltipOpen: boolean;
  /** Called with the anchor element when the tooltip should open */
  onOpen: (anchorEl: HTMLElement) => void;
  /** Called when the tooltip should close */
  onClose: () => void;
  /** Additional CSS class for styling */
  className?: string;
  /** Accessible label for the button role */
  ariaLabel?: string;
}

export function TooltipTriggerCell({
  tooltipId,
  displayValue,
  isTooltipOpen,
  onOpen,
  onClose,
  className,
  ariaLabel,
}: TooltipTriggerCellProps) {
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
      onOpen(e.currentTarget);
    },
    [onOpen, clearHoverTimeouts],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen(e.currentTarget);
      }
    },
    [onOpen],
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
        onOpen(target);
      }, 300);
    },
    [onOpen],
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

  const cellClassName = className
    ? `${styles.cell} ${className}`
    : styles.cell;

  return (
    <div
      className={cellClassName}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      aria-describedby={isTooltipOpen ? tooltipId : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {displayValue}
    </div>
  );
}
