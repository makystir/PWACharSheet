import { useState, useCallback } from 'react';
import { Tooltip } from '../Tooltip';
import { TooltipTriggerCell } from '../TooltipTriggerCell';
import styles from './guidedCastSteps.module.css';

export interface BreakdownTotalProps {
  /** Unique id for the tooltip / aria-describedby wiring. */
  tooltipId: string;
  /** Row label, e.g. "Casting target". */
  label: string;
  /** The calculated total shown in the cell. */
  value: string | number;
  /** Additive breakdown lines, e.g. ["Int total 35", "Advances 5", "= 40"]. */
  lines: string[];
}

/**
 * A single calculated total with its breakdown tooltip (calculated-totals
 * steering rule). Reuses the shared Tooltip / TooltipTriggerCell exactly as
 * SuggestionItem does — hover 300ms / tap / Enter-Space, single tooltip open at
 * a time (self-contained open state). The breakdown lines are passed in by the
 * step from the existing spell-casting calculators; nothing is recomputed here.
 */
export function BreakdownTotal({ tooltipId, label, value, lines }: BreakdownTotalProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = useCallback((el: HTMLElement) => setAnchorEl(el), []);
  const handleClose = useCallback(() => setAnchorEl(null), []);

  const isOpen = anchorEl !== null;

  return (
    <div className={styles.totalRow}>
      <span className={styles.totalLabel}>{label}</span>
      <TooltipTriggerCell
        tooltipId={tooltipId}
        displayValue={value}
        isTooltipOpen={isOpen}
        onOpen={handleOpen}
        onClose={handleClose}
        className={styles.totalValue}
        ariaLabel={`${label} breakdown`}
      />
      {isOpen && anchorEl && (
        <Tooltip anchorEl={anchorEl} title={label} onClose={handleClose} id={tooltipId}>
          <ul className={styles.breakdownList}>
            {lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </Tooltip>
      )}
    </div>
  );
}
