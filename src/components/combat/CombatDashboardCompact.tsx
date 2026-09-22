/**
 * CombatDashboardCompact — the compact sticky status strip (Requirement 9).
 *
 * Shown on mobile/tablet during Attack/Defend combat modes. It is a pure,
 * hook-free readout of wounds, advantage, and active condition count. It was
 * split out of CombatDashboard so the full dashboard can declare its hooks
 * unconditionally (previously an `if (compact) return ...` sat above the hooks,
 * violating the Rules of Hooks if a single instance ever toggled `compact`).
 */
import type { Condition } from '../../types/character';
import { getWoundColor } from './combatDashboardHelpers';
import { Heart, Zap, AlertTriangle } from 'lucide-react';
import styles from './CombatDashboard.module.css';

export interface CombatDashboardCompactProps {
  wCur: number;
  totalWounds: number;
  advantage: number;
  conditions: Condition[];
}

export function CombatDashboardCompact({
  wCur,
  totalWounds,
  advantage,
  conditions,
}: CombatDashboardCompactProps) {
  const activeConditionCount = conditions.length;
  const compactWoundColor = getWoundColor(wCur, totalWounds);

  return (
    <div
      className={styles.compactDashboard}
      data-testid="combat-dashboard-compact"
      aria-label="Combat status summary"
    >
      <div className={styles.compactItem}>
        <Heart size={14} color={compactWoundColor} aria-hidden="true" />
        <span className={styles.compactValue} style={{ color: compactWoundColor }}>
          {wCur}
        </span>
        <span className={styles.compactSeparator}>/</span>
        <span className={styles.compactMax}>{totalWounds}</span>
      </div>
      <div className={styles.compactItem}>
        <Zap size={14} color="var(--accent-gold)" aria-hidden="true" />
        <span className={styles.compactValue} style={{ color: 'var(--accent-gold)' }}>
          {advantage}
        </span>
      </div>
      {activeConditionCount > 0 && (
        <div className={styles.compactItem}>
          <AlertTriangle size={14} color="var(--text-muted)" aria-hidden="true" />
          <span className={styles.compactValue}>{activeConditionCount}</span>
          <span className={styles.compactLabel}>
            {activeConditionCount === 1 ? 'condition' : 'conditions'}
          </span>
        </div>
      )}
    </div>
  );
}
