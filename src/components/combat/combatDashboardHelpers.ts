/**
 * Pure presentation helpers for the Combat Dashboard.
 *
 * Extracted from CombatDashboard.tsx so both the full dashboard and the compact
 * sticky strip can share them, and so the component modules only export React
 * components (keeps Fast Refresh working — react-refresh/only-export-components).
 *
 * These map the current wounds relative to the maximum onto a severity band and
 * the corresponding colour / CSS-module class names. No game mechanic lives here
 * beyond the wound-percentage thresholds used purely for visual emphasis.
 */
import styles from './CombatDashboard.module.css';

export type WoundThreshold = 'healthy' | 'caution' | 'danger' | 'critical';

/**
 * Classify current wounds into a severity band based on the percentage of the
 * maximum remaining: >50% healthy, >25% caution, otherwise danger; zero/negative
 * wounds (or a non-positive maximum) are critical.
 */
export function getWoundThreshold(wCur: number, totalWounds: number): WoundThreshold {
  if (totalWounds <= 0) return 'critical';
  if (wCur <= 0) return 'critical';
  const pct = (wCur / totalWounds) * 100;
  if (pct > 50) return 'healthy';
  if (pct > 25) return 'caution';
  return 'danger';
}

export function getWoundColor(wCur: number, totalWounds: number): string {
  const threshold = getWoundThreshold(wCur, totalWounds);
  switch (threshold) {
    case 'healthy': return 'var(--success)';
    case 'caution': return 'var(--accent-gold)';
    case 'danger': return 'var(--danger)';
    case 'critical': return 'var(--danger)';
  }
}

export function getWoundPct(wCur: number, totalWounds: number): number {
  if (totalWounds <= 0) return 0;
  return Math.max(0, Math.min(100, (wCur / totalWounds) * 100));
}

export function getWoundClass(wCur: number, totalWounds: number): string {
  const threshold = getWoundThreshold(wCur, totalWounds);
  switch (threshold) {
    case 'healthy': return styles.woundHigh;
    case 'caution': return styles.woundMedium;
    case 'danger': return `${styles.woundLow} ${styles.woundDangerPulse}`;
    case 'critical': return `${styles.woundLow} ${styles.woundCritical}`;
  }
}

export function getProgressFillClass(wCur: number, totalWounds: number): string {
  const threshold = getWoundThreshold(wCur, totalWounds);
  switch (threshold) {
    case 'healthy': return styles.progressFillHigh;
    case 'caution': return styles.progressFillMedium;
    case 'danger': return styles.progressFillLow;
    case 'critical': return styles.progressFillLow;
  }
}

export function getWoundSectionClass(wCur: number, totalWounds: number): string {
  const threshold = getWoundThreshold(wCur, totalWounds);
  switch (threshold) {
    case 'healthy': return styles.woundsSection;
    case 'caution': return `${styles.woundsSection} ${styles.woundsSectionCaution}`;
    case 'danger': return `${styles.woundsSection} ${styles.woundsSectionDanger}`;
    case 'critical': return `${styles.woundsSection} ${styles.woundsSectionCritical}`;
  }
}
