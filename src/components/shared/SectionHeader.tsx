import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  icon: LucideIcon;
  title: ReactNode;
  action?: ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SectionHeader({ icon: Icon, title, action, collapsible, collapsed, onToggleCollapse }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <Icon size={14} />
      {collapsible ? (
        <button
          type="button"
          className={styles.collapseToggle}
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
        >
          <h3 className={styles.title}>{title}</h3>
          <span className={collapsed ? styles.chevron : styles.chevronExpanded} aria-hidden="true">▼</span>
        </button>
      ) : (
        <h3 className={styles.title}>{title}</h3>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
