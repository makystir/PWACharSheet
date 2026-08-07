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

// --- Internal State ---

interface InternalState {
  status: 'idle' | 'tracking' | 'dragging';
  dragIndex: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  pointerId: number;
  itemRects: DOMRect[]; // cached at drag start, never changes
  containerRect: DOMRect;
  scrollTimerId: number | null;
}

// --- Constants ---

const DRAG_THRESHOLD_PX = 5;
const AUTO_SCROLL_ZONE_PX = 40;
const AUTO_SCROLL_SPEED = 8;

// --- Helper: compute insertion index ---

export function computeInsertionIndex(
  pointerY: number,
  itemRects: DOMRect[],
  dragIndex: number,
  pointerX?: number
): number {
  if (itemRects.length === 0) return 0;

  const isMultiColumn = itemRects.length > 1 && itemRects.some((r, i) => {
    if (i === 0) return false;
    const prev = itemRects[i - 1];
    return Math.abs(r.top - prev.top) < 10 && Math.abs(r.left - prev.left) > 10;
  });

  if (!isMultiColumn || pointerX === undefined) {
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

// --- Helper: compute transform offsets for each item ---
// Each non-dragged item that needs to shift gets a pixel offset
// based on the cached rects (positions at drag start).

function computeShiftTransforms(
  itemCount: number,
  dragIndex: number,
  dropIndex: number,
  itemRects: DOMRect[]
): Array<{ x: number; y: number }> {
  const shifts: Array<{ x: number; y: number }> = new Array(itemCount).fill(null).map(() => ({ x: 0, y: 0 }));

  if (dragIndex === dropIndex || itemRects.length < itemCount) {
    return shifts;
  }

  // Items between dragIndex and dropIndex need to shift one slot
  // toward the drag origin to fill the gap.
  if (dragIndex < dropIndex) {
    // Dragging forward: items (dragIndex+1) to (dropIndex-1) shift backward one slot
    for (let i = dragIndex + 1; i < dropIndex; i++) {
      const targetRect = itemRects[i - 1]; // shift to previous slot
      const curRect = itemRects[i];
      shifts[i] = {
        x: targetRect.left - curRect.left,
        y: targetRect.top - curRect.top,
      };
    }
  } else {
    // Dragging backward: items (dropIndex) to (dragIndex-1) shift forward one slot
    for (let i = dropIndex; i < dragIndex; i++) {
      const targetRect = itemRects[i + 1]; // shift to next slot
      const curRect = itemRects[i];
      shifts[i] = {
        x: targetRect.left - curRect.left,
        y: targetRect.top - curRect.top,
      };
    }
  }

  return shifts;
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

  // Auto-scroll
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

  // --- Pointer handlers ---

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const internal = internalRef.current;
      if (!internal) return;

      const dx = e.clientX - internal.startX;
      const dy = e.clientY - internal.startY;
      internal.currentX = e.clientX;
      internal.currentY = e.clientY;

      if (internal.status === 'tracking') {
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
          internal.status = 'dragging';

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
        const newDropIndex = computeInsertionIndex(
          e.clientY, internal.itemRects, internal.dragIndex, e.clientX
        );

        setDragState(prev => {
          if (prev.offsetX === dx && prev.offsetY === dy && prev.dropIndex === newDropIndex) {
            return prev;
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
          e.clientY, internal.itemRects, internal.dragIndex, e.clientX
        );

        let toIndex = finalDropIndex;
        if (finalDropIndex > internal.dragIndex) {
          toIndex = finalDropIndex - 1;
        }

        if (toIndex !== internal.dragIndex) {
          onReorder(internal.dragIndex, toIndex);
          setAnnouncementText(
            generateAnnouncementText(`Item ${internal.dragIndex + 1}`, toIndex, items.length)
          );
        }
      }

      resetState();
      setTimeout(() => { contextMenuSuppressed.current = false; }, 0);
    },
    [items.length, onReorder, resetState]
  );

  const handlePointerCancel = useCallback(() => cancelDrag(), [cancelDrag]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && internalRef.current?.status === 'dragging') {
      e.preventDefault();
      cancelDrag();
    }
  }, [cancelDrag]);

  const handleContextMenu = useCallback((e: Event) => {
    if (contextMenuSuppressed.current) e.preventDefault();
  }, []);

  // --- Listener management ---

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

  useEffect(() => () => {
    if (internalRef.current?.scrollTimerId != null) cancelAnimationFrame(internalRef.current.scrollTimerId);
  }, []);

  // --- Compute shift transforms for non-dragged items ---

  const internal = internalRef.current;
  const shiftTransforms = (
    dragState.status === 'dragging' &&
    dragState.dragIndex !== null &&
    dragState.dropIndex !== null &&
    internal?.itemRects?.length
  )
    ? computeShiftTransforms(items.length, dragState.dragIndex, dragState.dropIndex, internal.itemRects)
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
          // Dragged item follows the pointer
          style.transform = `translate(${dragState.offsetX}px, ${dragState.offsetY}px)`;
          style.zIndex = 9999;
          style.position = 'relative';
          style.opacity = 0.85;
          style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
          style.pointerEvents = 'none';
          style.transition = 'box-shadow 0.2s, opacity 0.2s';
        } else if (shiftTransforms) {
          // Non-dragged items slide to their shifted positions
          const shift = shiftTransforms[index];
          if (shift.x !== 0 || shift.y !== 0) {
            style.transform = `translate(${shift.x}px, ${shift.y}px)`;
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
    [dragState, shiftTransforms]
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
