import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon: LucideIcon | ReactNode;
  heading: string;
  description?: string;
  tip?: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
}

export function EmptyState({ icon, heading, description, tip, action, compact }: EmptyStateProps) {
  const containerClass = compact
    ? `${styles.container} ${styles.compact}`
    : styles.container;

  // Determine if icon is a LucideIcon component or a ReactNode
  const isLucideIcon = typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon && 'render' in (icon as Record<string, unknown>));

  return (
    <div className={containerClass} role="status">
      {isLucideIcon ? (
        (() => {
          const Icon = icon as LucideIcon;
          return <Icon size={compact ? 16 : 36} className={styles.icon} />;
        })()
      ) : (
        <span className={styles.icon}>{icon}</span>
      )}
      <h3 className={styles.heading}>{heading}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {tip && <p className={styles.tip}>{tip}</p>}
      {action && (
        <button type="button" className={styles.actionButton} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
