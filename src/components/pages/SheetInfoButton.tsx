import type { Dispatch, SetStateAction } from 'react';
import type { TooltipContent } from '../../logic/tooltip-content';

/** Which info tooltip (if any) is currently open on the character sheet. */
export interface SheetTooltipState {
  type: 'skill' | 'talent';
  index: number;
  anchorEl: HTMLElement;
}

interface SheetInfoButtonProps {
  /** Tooltip category this button belongs to. */
  type: 'skill' | 'talent';
  /** Global index identifying this row within its category. */
  index: number;
  /** Accessible label, e.g. the skill or talent name. */
  label: string;
  /** CSS-module class for the button (passed in so this stays style-agnostic). */
  className: string;
  /** Currently-open tooltip state (shared across the sheet). */
  tooltip: SheetTooltipState | null;
  setTooltip: Dispatch<SetStateAction<SheetTooltipState | null>>;
  /** Resolves the tooltip body; returning null suppresses opening. */
  resolveContent: () => TooltipContent | null;
}

/**
 * The small "ⓘ" info button used by skill and talent rows to toggle their
 * detail tooltip. Extracted from CharacterPage, where this identical
 * open/close/aria block was duplicated three times (basic skills, advanced
 * skills, talents) differing only in type, index, label, and resolver.
 */
export function SheetInfoButton({
  type,
  index,
  label,
  className,
  tooltip,
  setTooltip,
  resolveContent,
}: SheetInfoButtonProps) {
  const isOpen = tooltip?.type === type && tooltip.index === index;
  return (
    <button
      type="button"
      className={className}
      aria-describedby={isOpen ? `tooltip-${type}-${index}` : undefined}
      aria-label={`Info for ${label}`}
      onClick={(e) => {
        if (isOpen) {
          setTooltip(null);
          return;
        }
        const content = resolveContent();
        if (content) {
          setTooltip({ type, index, anchorEl: e.currentTarget });
        }
      }}
    >
      ℹ
    </button>
  );
}
