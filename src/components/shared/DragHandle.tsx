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
      <button
        type="button"
        className={styles.moveButton}
        onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
        disabled={isFirst}
        aria-label={`Move ${itemLabel} up`}
      >
        <ChevronUp size={12} />
      </button>
      <span className={styles.grip} aria-hidden="true" draggable={false}>
        <GripVertical size={14} />
      </span>
      <button
        type="button"
        className={styles.moveButton}
        onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
        disabled={isLast}
        aria-label={`Move ${itemLabel} down`}
      >
        <ChevronDown size={12} />
      </button>
    </div>
  );
}
