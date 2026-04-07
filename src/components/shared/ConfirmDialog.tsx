import type { CSSProperties } from 'react';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const dialogStyle: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '24px',
  width: '90%',
  maxWidth: '360px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const messageStyle: CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: '14px',
  lineHeight: 1.5,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  justifyContent: 'flex-end',
};

const cancelBtnStyle: CSSProperties = {
  padding: '8px 16px',
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '13px',
};

const confirmBtnStyle: CSSProperties = {
  padding: '8px 16px',
  background: 'var(--danger)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '13px',
};

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ConfirmDialogProps) {
  return (
    <div style={overlayStyle} onClick={onCancel} role="dialog" aria-label="Confirmation">
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <p style={messageStyle}>{message}</p>
        <div style={actionsStyle}>
          <button type="button" onClick={onCancel} style={cancelBtnStyle}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} style={confirmBtnStyle}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
