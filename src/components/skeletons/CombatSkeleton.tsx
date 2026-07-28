import styles from './Skeleton.module.css';

export function CombatSkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-label="Loading page content">
      {/* Dashboard area */}
      <div className={styles.shimmer} style={{ height: '80px' }} />
      {/* Weapon cards */}
      <div className={styles.row}>
        <div className={styles.shimmer} style={{ height: '200px' }} />
        <div className={styles.shimmer} style={{ height: '200px' }} />
      </div>
      {/* Actions area */}
      <div className={styles.shimmer} style={{ height: '150px' }} />
    </div>
  );
}
