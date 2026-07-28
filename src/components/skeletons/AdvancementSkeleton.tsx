import styles from './Skeleton.module.css';

export function AdvancementSkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-label="Loading page content">
      {/* Header / XP summary */}
      <div className={styles.shimmer} style={{ height: '48px' }} />
      {/* Characteristics grid */}
      <div className={styles.row}>
        <div className={styles.shimmer} style={{ height: '120px' }} />
        <div className={styles.shimmer} style={{ height: '120px' }} />
      </div>
      {/* Skills list */}
      <div className={styles.shimmer} style={{ height: '180px' }} />
      {/* Talents section */}
      <div className={styles.shimmer} style={{ height: '140px' }} />
    </div>
  );
}
