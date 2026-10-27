import { Compass } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import styles from './GuidedCorruptionTrigger.module.css';

export interface GuidedCorruptionTriggerProps {
  /** Open the guide overlay for the character's Corruption track. */
  onOpen: () => void;
}

/**
 * "Guide me through corruption" opt-in trigger (guided-disease-corruption
 * FEAT-002), mirroring GuidedCastTrigger / GuidedDiseaseTrigger. Rendered once
 * near the Corruption Tracker section — the ONLY new default-render element the
 * guide adds to CorruptionCard. A native <button>, NOT part of any existing
 * control group, so the card's existing semantics/DOM are otherwise unchanged.
 * Uses the Compass icon (CorruptionCard already uses Skull and Bug for its own
 * sections, so a distinct icon avoids confusion). Text label on desktop;
 * icon-only on mobile where the card is compact.
 */
export function GuidedCorruptionTrigger({ onOpen }: GuidedCorruptionTriggerProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  return (
    <button
      type="button"
      className={styles.trigger}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label="Guide me through corruption"
      data-testid="guided-corruption-trigger"
    >
      <Compass size={16} aria-hidden="true" />
      {!isMobile && <span>Guide me through corruption</span>}
    </button>
  );
}
