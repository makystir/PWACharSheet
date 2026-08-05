import type { ReactNode } from 'react';
import styles from './SectionGroup.module.css';

interface SectionGroupProps {
  children: ReactNode;
  className?: string;
}

export function SectionGroup({ children, className }: SectionGroupProps) {
  return (
    <section className={`${styles.sectionGroup}${className ? ` ${className}` : ''}`}>
      {children}
    </section>
  );
}
