/**
 * Pure utility functions for undo operations on lists.
 * Used by the useUndoToast hook to remove and restore items at specific indices.
 */

/**
 * Returns a new array with the item at `index` removed.
 * Does not mutate the input array.
 */
export function removeAtIndex<T>(list: T[], index: number): T[] {
  return [...list.slice(0, index), ...list.slice(index + 1)];
}

/**
 * Returns a new array with `item` inserted at the given `index`.
 * Does not mutate the input array.
 */
export function restoreAtIndex<T>(list: T[], item: T, index: number): T[] {
  return [...list.slice(0, index), item, ...list.slice(index)];
}
