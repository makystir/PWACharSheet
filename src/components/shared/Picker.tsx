import { useState } from 'react';
import styles from './Picker.module.css';

interface PickerProps<T> {
  items: T[];
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  onClose: () => void;
  title?: string;
}

export function Picker<T>({ items, getLabel, onSelect, onClose, title }: PickerProps<T>) {
  const [search, setSearch] = useState('');

  const filtered = items.filter((item) =>
    getLabel(item).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-label={title || 'Picker'}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {title && (
          <h3 className={styles.title}>
            {title}
          </h3>
        )}
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          autoFocus
        />
        <div className={styles.list}>
          {filtered.map((item, i) => (
            <button
              key={i}
              type="button"
              className={styles.item}
              onClick={() => onSelect(item)}
            >
              {getLabel(item)}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className={styles.emptyMessage}>
              No items found
            </div>
          )}
        </div>
        <button type="button" onClick={onClose} className={styles.close}>
          Close
        </button>
      </div>
    </div>
  );
}
