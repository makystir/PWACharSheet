import type { Enterprise } from '../../types/character';
import styles from './EnterpriseSummaryCard.module.css';

interface EnterpriseSummaryCardProps {
  enterprise: Enterprise;
  onClick: () => void;
}

function formatCurrency(gc: number, ss: number, d: number): string {
  const parts: string[] = [];
  if (gc > 0) parts.push(`${gc} GC`);
  if (ss > 0) parts.push(`${ss} SS`);
  if (d > 0) parts.push(`${d} D`);
  return parts.length > 0 ? parts.join(' ') : '0';
}

export function EnterpriseSummaryCard({ enterprise, onClick }: EnterpriseSummaryCardProps) {
  const { name, type, expansionLevel, debt, creditorName, interestPayment } = enterprise;

  const debtDisplay = formatCurrency(debt.gc, debt.ss, debt.d);
  const interestDisplay = formatCurrency(interestPayment.gc, interestPayment.ss, interestPayment.d);

  return (
    <div
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View details for ${name}`}
    >
      <div className={styles.header}>
        <span className={styles.name}>{name}</span>
        <span className={styles.typeBadge}>{type}</span>
        <span className={styles.levelBadge}>Lv. {expansionLevel}</span>
      </div>
      <div className={styles.details}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Debt:</span>
          <span className={styles.detailValue}>{debtDisplay}</span>
        </div>
        {creditorName && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Creditor:</span>
            <span className={styles.detailValue}>{creditorName}</span>
          </div>
        )}
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Interest:</span>
          <span className={styles.detailValue}>{interestDisplay}</span>
        </div>
      </div>
    </div>
  );
}
