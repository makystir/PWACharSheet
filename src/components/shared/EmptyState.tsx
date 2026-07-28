import type { LucideIcon } from 'lucide-react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon: LucideIcon;
  heading: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
}

export function EmptyState({ icon: Icon, heading, description, action, compact }: EmptyStateProps) {
  const containerClass = compact
    ? `${styles.container} ${styles.compact}`
    : styles.container;

  return (
    <div className={containerClass} role="status">
      <Icon size={compact ? 16 : 36} className={styles.icon} />
      <h3 className={styles.heading}>{heading}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <button type="button" className={styles.actionButton} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
