import styles from './DropIndicator.module.css';

export interface DropIndicatorProps {
  visible: boolean;
}

export function DropIndicator({ visible }: DropIndicatorProps) {
  if (!visible) return null;
  return <div className={styles.indicator} />;
}
