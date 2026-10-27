import { Wand2 } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import styles from './GuidedCastTrigger.module.css';

export interface GuidedCastTriggerProps {
  /** Open the guide overlay for this spell row. */
  onOpen: () => void;
}

/**
 * "Guide my spell" opt-in trigger (guided-spellcasting design Decision 1),
 * mirroring GuidedTurnTrigger. Rendered per memorized castable spell row — the
 * ONLY new default-render element the guide adds to SpellCastingPanel. A native
 * <button>, NOT part of any existing control group, so the panel's existing
 * semantics/DOM are otherwise unchanged (AC-1). Text label on desktop; icon-only
 * Wand2 with an aria-label on mobile where the row is compact.
 */
export function GuidedCastTrigger({ onOpen }: GuidedCastTriggerProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  return (
    <button
      type="button"
      className={styles.trigger}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label="Guide my spell"
      data-testid="guided-cast-trigger"
    >
      <Wand2 size={16} aria-hidden="true" />
      {!isMobile && <span>Guide my spell</span>}
    </button>
  );
}
