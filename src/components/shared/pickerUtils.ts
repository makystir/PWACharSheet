interface GroupedItems<T> {
  group: string;
  items: T[];
}

/**
 * Groups items by the getGroup function, preserving first-seen group order.
 */
export function groupItems<T>(items: T[], getGroup: (item: T) => string): GroupedItems<T>[] {
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
