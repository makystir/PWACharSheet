import styles from './RestoreConfirmDialog.module.css';

const MAX_DISPLAYED_NAMES = 50;

interface RestoreConfirmDialogProps {
  characterCount: number;
  characterNames: string[];
  duplicateNames: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestoreConfirmDialog({
  characterCount,
  characterNames,
  duplicateNames,
  onConfirm,
  onCancel,
}: RestoreConfirmDialogProps) {
  const duplicateSet = new Set(duplicateNames);
  const displayedNames = characterNames.slice(0, MAX_DISPLAYED_NAMES);
  const remainingCount = characterNames.length - displayedNames.length;

  return (
    <div className={styles.overlay} onClick={onCancel} role="dialog" aria-label="Restore confirmation">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.heading}>Restore {characterCount} character{characterCount !== 1 ? 's' : ''}?</h3>

        {duplicateNames.length > 0 && (
          <div className={styles.duplicateWarning}>
            ⚠ {duplicateNames.length} character{duplicateNames.length !== 1 ? 's' : ''} already exist{duplicateNames.length === 1 ? 's' : ''} locally and will be imported as new copies.
          </div>
        )}

        <ul className={styles.nameList}>
          {displayedNames.map((name, i) => (
            <li
              key={i}
              className={duplicateSet.has(name) ? styles.nameItemDuplicate : styles.nameItem}
            >
              {duplicateSet.has(name) ? `⚠ ${name}` : name}
            </li>
          ))}
          {remainingCount > 0 && (
            <li className={styles.moreText}>...and {remainingCount} more</li>
          )}
        </ul>

        <div className={styles.actions}>
          <button type="button" onClick={onCancel} className={styles.cancelBtn}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={styles.confirmBtn}>
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
