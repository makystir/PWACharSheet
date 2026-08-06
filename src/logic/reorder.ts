/**
 * Move an element from one index to another, returning a new array.
 * All other elements maintain their relative order.
 * If fromIndex or toIndex is out of bounds (negative or >= arr.length),
 * returns the original array unchanged.
 * If fromIndex === toIndex, returns the original array unchanged.
 */
export function reorderArray<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= arr.length ||
    toIndex >= arr.length ||
    fromIndex === toIndex
  ) {
    return arr;
  }

  const result = [...arr];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}
