import { useRef, useCallback, type KeyboardEvent } from 'react';
import styles from './ChipGroup.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChipOption<T extends string> {
  /** The value committed when this chip is selected. */
  value: T;
  /** The visible chip text. */
  label: string;
}

export interface ChipGroupProps<T extends string> {
  /** Options rendered as chips, in display/navigation order. All are preserved. */
  options: ChipOption<T>[];
  /** The currently selected value. */
  value: T;
  /** Fired with the newly selected value when a chip is chosen. */
  onChange: (value: T) => void;
  /**
   * Accessible label for the group. Applied to the container `role="radiogroup"`
   * so assistive tech and tests can find the control the same way the old
   * native `<select aria-label="…">` was found.
   */
  ariaLabel: string;
  /** Optional test id on the group container. */
  dataTestId?: string;
  /** Optional extra class on the group container. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Reusable chip-group control used in place of a native `<select>` for
 * frequently-changed combat values (ux-audit-improvements Req 10). It renders a
 * WAI-ARIA radiogroup: the container is `role="radiogroup"` and each chip is a
 * `role="radio"` button carrying `aria-checked`. Arrow keys move (and commit)
 * the selection between chips, Home/End jump to the first/last chip, and only
 * the selected chip is in the tab order (roving tabindex), matching the radio
 * pattern. Chips are ≥44px tall for touch (see ChipGroup.module.css), and the
 * selected chip is visually indicated (Req 10.3, 10.4).
 */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  dataTestId,
  className,
}: ChipGroupProps<T>) {
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const focusAndSelect = useCallback(
    (index: number) => {
      const clamped = (index + options.length) % options.length;
      const option = options[clamped];
      if (!option) return;
      onChange(option.value);
      // Move focus to the chip that just became selected (roving tabindex).
      chipRefs.current[clamped]?.focus();
    },
    [options, onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          focusAndSelect(index + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          focusAndSelect(index - 1);
          break;
        case 'Home':
          e.preventDefault();
          focusAndSelect(0);
          break;
        case 'End':
          e.preventDefault();
          focusAndSelect(options.length - 1);
          break;
        default:
          break;
      }
    },
    [focusAndSelect, options.length],
  );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={className ? `${styles.group} ${className}` : styles.group}
      data-testid={dataTestId}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              chipRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            // Roving tabindex: only the selected chip is tabbable; if nothing
            // matches (shouldn't happen), the first chip is tabbable.
            tabIndex={index === selectedIndex ? 0 : -1}
            className={isSelected ? styles.chipSelected : styles.chip}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
