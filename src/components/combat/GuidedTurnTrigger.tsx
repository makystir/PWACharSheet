import { Compass } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import styles from './GuidedTurnTrigger.module.css';

export interface GuidedTurnTriggerProps {
  /** Open the guide overlay. */
  onOpen: () => void;
}

/**
 * "Guide my turn" opt-in trigger (guided-combat-turn design Decision 1). A
 * native <button> rendered as the TRAILING element of the existing
 * Attack/Defend/Status segmented-control container — NOT a fourth tab and NOT
 * part of the `role="tablist"`, so the existing tab semantics/DOM are unchanged
 * (AC-3, NFR-5). Text label on desktop; icon-only Compass with an aria-label on
 * mobile where the strip is compact.
 */
export function GuidedTurnTrigger({ onOpen }: GuidedTurnTriggerProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  return (
    <button
      type="button"
      className={styles.trigger}
      onClick={onOpen}
      aria-label="Guide my turn"
      data-testid="guided-turn-trigger"
    >
      <Compass size={18} aria-hidden="true" />
      {!isMobile && <span>Guide my turn</span>}
    </button>
  );
}
