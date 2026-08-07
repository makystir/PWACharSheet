import styles from './DropIndicator.module.css';

export interface DropIndicatorProps {
  visible: boolean;
}

export function DropIndicator({ visible }: DropIndicatorProps) {
  return <div className={visible ? styles.indicator : styles.indicatorHidden} />;
}
