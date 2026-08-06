import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import styles from './DragHandle.module.css';

export interface DragHandleProps {
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  itemLabel: string;
}

export function DragHandle({ onMoveUp, onMoveDown, isFirst, isLast, itemLabel }: DragHandleProps) {
  return (
    <div className={styles.dragHandle}>
      <span className={styles.grip} aria-hidden="true">
        <GripVertical size={16} />
      </span>
      <button
        type="button"
        className={styles.moveButton}
        onClick={onMoveUp}
        disabled={isFirst}
        aria-label={`Move ${itemLabel} up`}
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        className={styles.moveButton}
        onClick={onMoveDown}
        disabled={isLast}
        aria-label={`Move ${itemLabel} down`}
      >
        <ChevronDown size={14} />
      </button>
    </div>
  );
}
