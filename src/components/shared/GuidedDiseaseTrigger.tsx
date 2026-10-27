import { Stethoscope } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import styles from './GuidedDiseaseTrigger.module.css';

export interface GuidedDiseaseTriggerProps {
  /** The ActiveDisease.id this trigger opens the guide for. */
  diseaseId: number;
  /** Open the guide overlay bound to this disease row. */
  onOpen: (diseaseId: number) => void;
}

/**
 * "Guide me through this disease" opt-in trigger (guided-disease-corruption
 * FEAT-001), mirroring GuidedCastTrigger. Rendered once per rendered active
 * disease row — the ONLY new default-render element the guide adds to
 * DiseasePanel. A native <button>, NOT part of any existing control group, so
 * the panel's existing semantics/DOM are otherwise unchanged. Uses the
 * Stethoscope icon (DiseasePanel already uses HeartPulse for its own header, so
 * a distinct icon avoids confusion). Text label on desktop; icon-only on mobile
 * where the row is compact.
 */
export function GuidedDiseaseTrigger({ diseaseId, onOpen }: GuidedDiseaseTriggerProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  return (
    <button
      type="button"
      className={styles.trigger}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(diseaseId);
      }}
      aria-label="Guide me through this disease"
      data-testid="guided-disease-trigger"
    >
      <Stethoscope size={16} aria-hidden="true" />
      {!isMobile && <span>Guide me through this</span>}
    </button>
  );
}
