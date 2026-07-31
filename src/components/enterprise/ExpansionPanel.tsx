import type { Enterprise } from '../../types/character';
import { ENTERPRISE_TEMPLATE_MAP } from '../../data/enterprises';
import { hasOutstandingDebt } from '../../logic/enterprise-utils';
import styles from './ExpansionPanel.module.css';

interface ExpansionPanelProps {
  enterprise: Enterprise;
  onExpand: () => void;
}

function formatCurrency(gc: number, ss: number, d: number): string {
  const parts: string[] = [];
  if (gc > 0) parts.push(`${gc} GC`);
  if (ss > 0) parts.push(`${ss} SS`);
  if (d > 0) parts.push(`${d} D`);
  return parts.length > 0 ? parts.join(' ') : '0';
}

export function ExpansionPanel({ enterprise, onExpand }: ExpansionPanelProps) {
  const isMaxLevel = enterprise.expansionLevel >= 4;
  const hasDept = hasOutstandingDebt(enterprise.debt);
  const template = ENTERPRISE_TEMPLATE_MAP[enterprise.type];

  if (isMaxLevel) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.currentLevel}>Level {enterprise.expansionLevel}</span>
          <span className={styles.maxReached}>Maximum expansion reached</span>
        </div>
      </div>
    );
  }

  const nextLevel = enterprise.expansionLevel + 1;
  const levelKey = `level${nextLevel}` as keyof typeof template.expansions;
  const expansion = template.expansions[levelKey];

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.currentLevel}>Level {enterprise.expansionLevel}</span>
      </div>

      <div className={styles.nextLevelInfo}>
        <span className={styles.nextLevelTitle}>Level {nextLevel} Expansion</span>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Cost:</span>
          <span className={styles.infoValue}>
            {formatCurrency(expansion.cost.gc, expansion.cost.ss, expansion.cost.d)}
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Min Owner Contribution:</span>
          <span className={styles.infoValue}>
            {formatCurrency(
              expansion.minOwnerContribution.gc,
              expansion.minOwnerContribution.ss,
              expansion.minOwnerContribution.d,
            )}
          </span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>New Interest Payment:</span>
          <span className={styles.infoValue}>
            {formatCurrency(
              expansion.interestPayment.gc,
              expansion.interestPayment.ss,
              expansion.interestPayment.d,
            )}
          </span>
        </div>

        {expansion.benefits && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Benefits:</span>
            <span className={styles.benefits}>{expansion.benefits}</span>
          </div>
        )}

        {expansion.additionalTrappings.length > 0 && (
          <div className={styles.listSection}>
            <span className={styles.listTitle}>Additional Trappings</span>
            {expansion.additionalTrappings.map((trapping) => (
              <span key={trapping} className={styles.listItem}>{trapping}</span>
            ))}
          </div>
        )}

        {expansion.additionalIncomeSources.length > 0 && (
          <div className={styles.listSection}>
            <span className={styles.listTitle}>New Income Sources</span>
            {expansion.additionalIncomeSources.map((source) => (
              <span key={source.description} className={styles.listItem}>
                {source.description} ({source.earningSkill}, {source.effectiveStatus})
              </span>
            ))}
          </div>
        )}
      </div>

      {hasDept && (
        <span className={styles.debtWarning}>Repay all debt before expanding</span>
      )}

      <button
        type="button"
        className={styles.expandButton}
        onClick={onExpand}
        disabled={hasDept}
        aria-label={hasDept ? 'Repay all debt before expanding' : `Expand to Level ${nextLevel}`}
      >
        Expand to Level {nextLevel}
      </button>
    </div>
  );
}
