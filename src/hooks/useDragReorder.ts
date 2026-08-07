import { useCallback, useEffect, useRef, useState } from 'react';

// --- Public Interfaces ---

export interface UseDragReorderOptions<T> {
  items: T[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  containerRef: React.RefObject<HTMLElement | null>;
}

export interface DragState {
  status: 'idle' | 'tracking' | 'dragging';
  dragIndex: number | null;
  dropIndex: number | null;
  offsetX: number;
  offsetY: number;
}

export interface UseDragReorderResult {
  dragState: DragState;
  getGripProps: (index: number) => {
    onPointerDown: (e: React.PointerEvent) => void;
    'aria-roledescription': string;
    style?: React.CSSProperties;
  };
  getItemProps: (index: number) => {
    'data-drag-item': string;
    className?: string;
    style: React.CSSProperties;
    'aria-grabbed'?: boolean;
  };
  dropIndicatorIndex: number | null;
  announcementText: string;
}

// --- Internal State (mutable ref, no re-renders) ---

interface InternalState {
  status: 'idle' | 'tracking' | 'dragging';
  dragIndex: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  pointerId: number;
  itemRects: DOMRect[];
  containerRect: DOMRect;
  scrollTimerId: number | null;
}

// --- Constants ---

const DRAG_THRESHOLD_PX = 5;
const AUTO_SCROLL_ZONE_PX = 40;
const AUTO_SCROLL_SPEED = 8;

// --- Helper: compute insertion index from pointer position and cached rects ---

export function computeInsertionIndex(
  pointerY: number,
  itemRects: DOMRect[],
  dragIndex: number,
  pointerX?: number
): number {
  if (itemRects.length === 0) return 0;

  // Detect multi-column grid
  const isMultiColumn = itemRects.length > 1 && itemRects.some((r, i) => {
    if (i === 0) return false;
    const prev = itemRects[i - 1];
    return Math.abs(r.top - prev.top) < 10 && Math.abs(r.left - prev.left) > 10;
  });

  if (!isMultiColumn || pointerX === undefined) {
    // Single-column: count midpoints above pointer
    let index = 0;
    for (let i = 0; i < itemRects.length; i++) {
      const midY = itemRects[i].top + itemRects[i].height / 2;
      if (pointerY > midY) {
        index = i + 1;
      } else {
        break;
      }
    }
    return Math.max(0, Math.min(index, itemRects.length));
  }

  // Multi-column: find closest item center in 2D
  let closestIndex = 0;
  let closestDist = Infinity;

  for (let i = 0; i < itemRects.length; i++) {
    const r = itemRects[i];
    const midX = r.left + r.width / 2;
    const midY = r.top + r.height / 2;
    const dist = Math.sqrt((pointerX - midX) ** 2 + (pointerY - midY) ** 2);
    if (dist < closestDist) {
      closestDist = dist;
      closestIndex = i;
    }
  }

  const closest = itemRects[closestIndex];
  const closestMidX = closest.left + closest.width / 2;
  const closestMidY = closest.top + closest.height / 2;

  if (pointerY > closestMidY + closest.height / 2) {
    return Math.min(closestIndex + 1, itemRects.length);
  } else if (pointerY < closestMidY - closest.height / 2) {
    return closestIndex;
  } else {
    return pointerX > closestMidX
      ? Math.min(closestIndex + 1, itemRects.length)
      : closestIndex;
  }
}

// --- Helper: generate announcement text ---

export function generateAnnouncementText(
  itemLabel: string,
  toIndex: number,
  totalItems: number
): string {
  return `${itemLabel} moved to position ${toIndex + 1} of ${totalItems}`;
}

// --- Helper: compute CSS order for each item to simulate reorder ---
// Given N items, dragIndex, and dropIndex (insertion point),
// returns an array of CSS `order` values that visually reorders items
// as if the dragged item was removed and re-inserted at dropIndex.

function computeVisualOrders(
  itemCount: number,
  dragIndex: number,
  dropIndex: number
): number[] {
  // Build the visual sequence: remove dragIndex, insert at dropIndex
  const indices = Array.from({ length: itemCount }, (_, i) => i);
  const [removed] = indices.splice(dragIndex, 1);
  const insertAt = dropIndex > dragIndex ? dropIndex - 1 : dropIndex;
  indices.splice(insertAt, 0, removed);

  // Now indices[visualPos] = originalIndex
  // We need order[originalIndex] = visualPos
  const orders = new Array(itemCount);
  for (let visualPos = 0; visualPos < indices.length; visualPos++) {
    orders[indices[visualPos]] = visualPos;
  }
  return orders;
}

// --- The Hook ---

const IDLE_STATE: DragState = {
  status: 'idle',
  dragIndex: null,
  dropIndex: null,
  offsetX: 0,
  offsetY: 0,
};

export function useDragReorder<T>(
  options: UseDragReorderOptions<T>
): UseDragReorderResult {
  const { items, onReorder, containerRef } = options;

  const [dragState, setDragState] = useState<DragState>(IDLE_STATE);
  const [announcementText, setAnnouncementText] = useState('');

  const internalRef = useRef<InternalState | null>(null);
  const contextMenuSuppressed = useRef(false);

  // --- State transitions ---

  const resetState = useCallback(() => {
    const internal = internalRef.current;
    if (internal?.scrollTimerId != null) {
      cancelAnimationFrame(internal.scrollTimerId);
    }
    internalRef.current = null;
    setDragState(IDLE_STATE);
  }, []);

  const cancelDrag = useCallback(() => {
    resetState();
    setTimeout(() => { contextMenuSuppressed.current = false; }, 0);
  }, [resetState]);

  // --- Auto-scroll ---

  const autoScroll = useCallback(() => {
    const internal = internalRef.current;
    const container = containerRef.current;
    if (!internal || !container || internal.status !== 'dragging') return;

    const containerRect = container.getBoundingClientRect();
    const pointerY = internal.currentY;
    const distFromTop = pointerY - containerRect.top;
    const distFromBottom = containerRect.bottom - pointerY;

    let scrollDelta = 0;
    if (distFromTop < AUTO_SCROLL_ZONE_PX) {
      scrollDelta = -AUTO_SCROLL_SPEED * (1 - distFromTop / AUTO_SCROLL_ZONE_PX);
    } else if (distFromBottom < AUTO_SCROLL_ZONE_PX) {
      scrollDelta = AUTO_SCROLL_SPEED * (1 - distFromBottom / AUTO_SCROLL_ZONE_PX);
    }

    if (scrollDelta !== 0) {
      container.scrollTop += scrollDelta;
    }

    internal.scrollTimerId = requestAnimationFrame(autoScroll);
  }, [containerRef]);

  // --- Pointer event handlers ---

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const internal = internalRef.current;
      if (!internal) return;

      const dx = e.clientX - internal.startX;
      const dy = e.clientY - internal.startY;
      internal.currentX = e.clientX;
      internal.currentY = e.clientY;

      if (internal.status === 'tracking') {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > DRAG_THRESHOLD_PX) {
          internal.status = 'dragging';

          // Cache item rects at drag start
          const container = containerRef.current;
          if (container) {
            const children = Array.from(container.children) as HTMLElement[];
            const dragItems = children.filter(c => c.dataset.dragItem !== undefined);
            internal.itemRects = dragItems.map(c => c.getBoundingClientRect());
            internal.containerRect = container.getBoundingClientRect();
          }

          internal.scrollTimerId = requestAnimationFrame(autoScroll);
          contextMenuSuppressed.current = true;

          setDragState({
            status: 'dragging',
            dragIndex: internal.dragIndex,
            dropIndex: internal.dragIndex,
            offsetX: dx,
            offsetY: dy,
          });
        }
      } else if (internal.status === 'dragging') {
        // Compute new drop index
        const newDropIndex = computeInsertionIndex(
          e.clientY,
          internal.itemRects,
          internal.dragIndex,
          e.clientX
        );

        // Update state (React handles rendering — offset for drag preview, dropIndex for reorder visual)
        setDragState(prev => {
          if (prev.offsetX === dx && prev.offsetY === dy && prev.dropIndex === newDropIndex) {
            return prev; // no change, skip re-render
          }
          return { ...prev, offsetX: dx, offsetY: dy, dropIndex: newDropIndex };
        });
      }
    },
    [containerRef, autoScroll]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      const internal = internalRef.current;
      if (!internal) return;

      if (internal.status === 'dragging') {
        const finalDropIndex = computeInsertionIndex(
          e.clientY,
          internal.itemRects,
          internal.dragIndex,
          e.clientX
        );

        let toIndex = finalDropIndex;
        if (finalDropIndex > internal.dragIndex) {
          toIndex = finalDropIndex - 1;
        }

        if (toIndex !== internal.dragIndex) {
          onReorder(internal.dragIndex, toIndex);
          setAnnouncementText(
            generateAnnouncementText(
              `Item ${internal.dragIndex + 1}`,
              toIndex,
              items.length
            )
          );
        }
      }

      resetState();
      setTimeout(() => { contextMenuSuppressed.current = false; }, 0);
    },
    [items.length, onReorder, resetState]
  );

  const handlePointerCancel = useCallback(() => {
    cancelDrag();
  }, [cancelDrag]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && internalRef.current?.status === 'dragging') {
        e.preventDefault();
        cancelDrag();
      }
    },
    [cancelDrag]
  );

  const handleContextMenu = useCallback((e: Event) => {
    if (contextMenuSuppressed.current) {
      e.preventDefault();
    }
  }, []);

  // --- Global listener management ---

  useEffect(() => {
    if (dragState.status === 'idle') return;

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerCancel);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerCancel);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [dragState.status, handlePointerMove, handlePointerUp, handlePointerCancel, handleKeyDown, handleContextMenu]);

  useEffect(() => {
    return () => {
      if (internalRef.current?.scrollTimerId != null) {
        cancelAnimationFrame(internalRef.current.scrollTimerId);
      }
    };
  }, []);

  // --- Compute visual orders when dragging ---

  const visualOrders = dragState.status === 'dragging' &&
    dragState.dragIndex !== null &&
    dragState.dropIndex !== null
    ? computeVisualOrders(items.length, dragState.dragIndex, dragState.dropIndex)
    : null;

  // --- Public API ---

  const getGripProps = useCallback(
    (index: number) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        const container = containerRef.current;
        if (!container) return;

        const target = e.currentTarget as HTMLElement;
        try { target.setPointerCapture(e.pointerId); } catch { /* */ }

        internalRef.current = {
          status: 'tracking',
          dragIndex: index,
          startX: e.clientX,
          startY: e.clientY,
          currentX: e.clientX,
          currentY: e.clientY,
          pointerId: e.pointerId,
          itemRects: [],
          containerRect: container.getBoundingClientRect(),
          scrollTimerId: null,
        };

        setDragState({
          status: 'tracking',
          dragIndex: index,
          dropIndex: null,
          offsetX: 0,
          offsetY: 0,
        });

        e.preventDefault();
      },
      'aria-roledescription': 'sortable' as const,
      style: { touchAction: 'none' } as React.CSSProperties,
    }),
    [containerRef]
  );

  const getItemProps = useCallback(
    (index: number) => {
      const isDragging = dragState.status === 'dragging' && dragState.dragIndex === index;

      const style: React.CSSProperties = {};

      if (dragState.status === 'dragging') {
        if (isDragging) {
          // The dragged item stays at its original grid position (order = index)
          // and follows the pointer via transform only
          style.order = index;
          style.transform = `translate(${dragState.offsetX}px, ${dragState.offsetY}px)`;
          style.zIndex = 9999;
          style.position = 'relative';
          style.opacity = 0.85;
          style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
          style.pointerEvents = 'none';
          style.transition = 'box-shadow 0.2s, opacity 0.2s';
        } else {
          // Non-dragged items get CSS order for visual reordering
          if (visualOrders) {
            style.order = visualOrders[index];
          }
          style.transition = 'transform 0.25s ease';
        }
      }

      return {
        'data-drag-item': '',
        className: isDragging ? 'drag-item-dragging' : undefined,
        style,
        'aria-grabbed': isDragging ? true : undefined,
      };
    },
    [dragState, visualOrders]
  );

  const dropIndicatorIndex = dragState.status === 'dragging' ? dragState.dropIndex : null;

  return {
    dragState,
    getGripProps,
    getItemProps,
    dropIndicatorIndex,
    announcementText,
  };
}
