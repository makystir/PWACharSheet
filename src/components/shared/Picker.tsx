import { useState, useMemo } from 'react';
import styles from './Picker.module.css';

interface PickerProps<T> {
  items: T[];
  getLabel: (item: T) => string;
  getGroup?: (item: T) => string;
  isDisabled?: (item: T) => boolean;
  onSelect: (item: T) => void;
  onClose: () => void;
  title?: string;
}

interface GroupedItems<T> {
  group: string;
  items: T[];
}

/**
 * Groups items by the getGroup function, preserving first-seen group order.
 */
function groupItems<T>(items: T[], getGroup: (item: T) => string): GroupedItems<T>[] {
  const groupOrder: string[] = [];
  const groupMap = new Map<string, T[]>();

  for (const item of items) {
    const group = getGroup(item);
    if (!groupMap.has(group)) {
      groupOrder.push(group);
      groupMap.set(group, []);
    }
    groupMap.get(group)!.push(item);
  }

  return groupOrder.map((group) => ({
    group,
    items: groupMap.get(group)!,
  }));
}

export function Picker<T>({ items, getLabel, getGroup, isDisabled, onSelect, onClose, title }: PickerProps<T>) {
  const [search, setSearch] = useState('');

  const searchLower = search.toLowerCase();

  const filtered = useMemo(
    () => items.filter((item) => getLabel(item).toLowerCase().includes(searchLower)),
    [items, getLabel, searchLower]
  );

  const renderItem = (item: T, key: number) => {
    const disabled = isDisabled?.(item) ?? false;
    return disabled ? (
      <div
        key={key}
        className={styles.itemDisabled}
        aria-disabled="true"
      >
        {getLabel(item)}
      </div>
    ) : (
      <button
        key={key}
        type="button"
        className={styles.item}
        onClick={() => onSelect(item)}
      >
        {getLabel(item)}
      </button>
    );
  };

  const renderList = () => {
    if (!getGroup) {
      // Flat list (existing behaviour when no getGroup provided)
      if (filtered.length === 0) {
        return (
          <div className={styles.emptyMessage}>
            No items found
          </div>
        );
      }
      return filtered.map((item, i) => renderItem(item, i));
    }

    // Grouped mode: group ALL items first (preserves first-seen order),
    // then filter within each group
    const groups = groupItems(items, getGroup);
    let keyCounter = 0;
    let hasAnyVisibleItem = false;

    const content = groups.map((group) => {
      const visibleItems = group.items.filter((item) =>
        getLabel(item).toLowerCase().includes(searchLower)
      );

      // Hide group header if no matching items in this group
      if (visibleItems.length === 0) {
        return null;
      }

      hasAnyVisibleItem = true;

      return (
        <div
          key={`group-${group.group}`}
          role="group"
          aria-label={group.group}
          className={styles.group}
        >
          <div className={styles.groupHeader} aria-hidden="true">
            {group.group}
          </div>
          {visibleItems.map((item) => renderItem(item, keyCounter++))}
        </div>
      );
    });

    if (!hasAnyVisibleItem) {
      return (
        <div className={styles.emptyMessage}>
          No items found
        </div>
      );
    }

    return content;
  };

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
          {renderList()}
        </div>
        <button type="button" onClick={onClose} className={styles.close}>
          Close
        </button>
      </div>
    </div>
  );
}

// Export groupItems for testing
export { groupItems };
