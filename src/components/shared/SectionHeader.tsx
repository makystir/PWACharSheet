import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}

export function SectionHeader({ icon: Icon, title, action }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <Icon size={20} color="var(--accent-gold)" />
      <h3 className={styles.title}>{title}</h3>
      {action && <div>{action}</div>}
    </div>
  );
}
