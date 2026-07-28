import styles from './Skeleton.module.css';

export function SettingsSkeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-label="Loading page content">
      {/* Settings header */}
      <div className={styles.shimmer} style={{ height: '40px' }} />
      {/* Toggle rows */}
      <div className={styles.shimmer} style={{ height: '56px' }} />
      <div className={styles.shimmer} style={{ height: '56px' }} />
      <div className={styles.shimmer} style={{ height: '56px' }} />
      {/* Export/Import section */}
      <div className={styles.shimmer} style={{ height: '100px' }} />
    </div>
  );
}
