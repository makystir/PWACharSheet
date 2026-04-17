import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ConfirmDialogProps) {
  return (
    <div className={styles.overlay} onClick={onCancel} role="dialog" aria-label="Confirmation">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button type="button" onClick={onCancel} className={styles.cancelBtn}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={styles.confirmBtn}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
