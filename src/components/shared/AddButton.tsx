import type { CSSProperties } from 'react';
import { Plus } from 'lucide-react';
import styles from './AddButton.module.css';

interface AddButtonProps {
  label?: string;
  onClick: () => void;
  style?: CSSProperties;
}

export function AddButton({ label = 'Add', onClick, style }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={styles.addButton}
      style={style}
    >
      <Plus size={14} />
      {label}
    </button>
  );
}
