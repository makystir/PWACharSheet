import { useCallback, useEffect, useRef, useState } from 'react';

// --- Public Interfaces ---

export interface UseDragReorderOptions<T> {
  items: T[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  containerRef: React.RefObject<HTMLElement | null>;
  axis?: 'vertical' | 'horizontal'; // default: 'vertical'
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
    className?: string;
    style?: React.CSSProperties;
    'aria-grabbed'?: boolean;
  };
  dropIndicatorIndex: number | null;
  announcementText: string;
}

// --- Internal State ---

interface InternalDragState {
  status: 'idle' | 'tracking' | 'dragging';
  dragIndex: number;
  startY: number;
  startX: number;
  currentY: number;
  currentX: number;
  dropIndex: number;
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

  // Detect if this is a multi-column grid by checking if any two items
  // share similar Y positions (same row) but differ in X.
  const isMultiColumn = itemRects.length > 1 && itemRects.some((r, i) => {
    if (i === 0) return false;
    const prev = itemRects[i - 1];
    // Same row: tops within 10px of each other, but left positions differ
    return Math.abs(r.top - prev.top) < 10 && Math.abs(r.left - prev.left) > 10;
  });

  if (!isMultiColumn || pointerX === undefined) {
    // Single-column layout: use original vertical-only logic
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

  // Multi-column grid: find the closest item center in 2D space.
  // Items are in DOM/reading order (row-major: left-to-right, top-to-bottom).
  // Insertion index = the position before the item whose center is closest
  // to the pointer, biased by whether the pointer is before or after that center.
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

  // Determine if pointer is "after" the closest item (insert after it)
  // or "before" it (insert before it).
  const closest = itemRects[closestIndex];
  const closestMidX = closest.left + closest.width / 2;
  const closestMidY = closest.top + closest.height / 2;

  // If pointer is below the item's row, or on the same row but to the right of center
  if (pointerY > closestMidY + closest.height / 2) {
    // Pointer is clearly below this item's row
    return Math.min(closestIndex + 1, itemRects.length);
  } else if (pointerY < closestMidY - closest.height / 2) {
    // Pointer is clearly above this item's row
    return closestIndex;
  } else {
    // Same row — decide based on X position
    if (pointerX > closestMidX) {
      return Math.min(closestIndex + 1, itemRects.length);
    } else {
      return closestIndex;
    }
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

  // Internal mutable ref for tracking state without re-renders on every pointermove
  const internalRef = useRef<InternalDragState | null>(null);
  const contextMenuSuppressed = useRef(false);
  const gripElementRef = useRef<HTMLElement | null>(null);

  // Reset to idle
  const resetState = useCallback(() => {
    const internal = internalRef.current;
    if (internal?.scrollTimerId != null) {
      cancelAnimationFrame(internal.scrollTimerId);
    }
    internalRef.current = null;
    setDragState(IDLE_STATE);
  }, []);

  // Cancel drag without reordering
  const cancelDrag = useCallback(() => {
    const internal = internalRef.current;
    if (internal && gripElementRef.current) {
      try {
        gripElementRef.current.releasePointerCapture(internal.pointerId);
      } catch {
        // pointer capture may already be released
      }
    }
    resetState();
  }, [resetState]);

  // Compute drop index from pointer position
  const updateDropIndex = useCallback((clientX: number, clientY: number) => {
    const internal = internalRef.current;
    if (!internal) return;

    const newDropIndex = computeInsertionIndex(
      clientY,
      internal.itemRects,
      internal.dragIndex,
      clientX
    );

    // Throttle: only update if index actually changed
    if (newDropIndex !== internal.dropIndex) {
      internal.dropIndex = newDropIndex;
      setDragState(prev => ({
        ...prev,
        dropIndex: newDropIndex,
      }));
    }
  }, []);

  // Auto-scroll logic
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
      // Re-cache item rects after scroll since positions shifted
      const children = container.children;
      const rects: DOMRect[] = [];
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        // Skip drop indicators and non-item elements
        if (child.dataset.dragItem !== undefined) {
          rects.push(child.getBoundingClientRect());
        }
      }
      if (rects.length > 0) {
        internal.itemRects = rects;
      }
    }

    internal.scrollTimerId = requestAnimationFrame(autoScroll);
  }, [containerRef]);

  // --- Pointer Event Handlers ---

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const internal = internalRef.current;
      if (!internal) return;

      const dx = e.clientX - internal.startX;
      const dy = e.clientY - internal.startY;
      internal.currentY = e.clientY;
      internal.currentX = e.clientX;

      if (internal.status === 'tracking') {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > DRAG_THRESHOLD_PX) {
          // Transition to dragging
          internal.status = 'dragging';

          // Cache item bounding rects
          const container = containerRef.current;
          if (container) {
            const children = Array.from(container.children) as HTMLElement[];
            internal.itemRects = children
              .filter(child => child.dataset.dragItem !== undefined)
              .map(child => child.getBoundingClientRect());
            internal.containerRect = container.getBoundingClientRect();
          }

          // Start auto-scroll
          internal.scrollTimerId = requestAnimationFrame(autoScroll);

          // Suppress context menu for touch
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
        // Update visual offset
        setDragState(prev => ({
          ...prev,
          offsetX: dx,
          offsetY: dy,
        }));

        // Update drop index
        updateDropIndex(e.clientX, e.clientY);
      }
    },
    [containerRef, autoScroll, updateDropIndex]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      const internal = internalRef.current;
      if (!internal) return;

      // Release pointer capture
      if (gripElementRef.current) {
        try {
          gripElementRef.current.releasePointerCapture(internal.pointerId);
        } catch {
          // already released
        }
      }

      if (internal.status === 'dragging') {
        const finalDropIndex = computeInsertionIndex(
          e.clientY,
          internal.itemRects,
          internal.dragIndex,
          e.clientX
        );

        // Adjust for removal: if dropping after original position, the effective
        // target index is one less since the dragged item is removed first
        let toIndex = finalDropIndex;
        if (finalDropIndex > internal.dragIndex) {
          toIndex = finalDropIndex - 1;
        }

        if (toIndex !== internal.dragIndex) {
          onReorder(internal.dragIndex, toIndex);
          // Generate announcement
          setAnnouncementText(
            generateAnnouncementText(
              `Item ${internal.dragIndex + 1}`,
              toIndex,
              items.length
            )
          );
        }
      }

      // Clean up
      resetState();

      // Allow context menu again after a tick
      setTimeout(() => {
        contextMenuSuppressed.current = false;
      }, 0);
    },
    [items.length, onReorder, resetState]
  );

  const handlePointerCancel = useCallback(() => {
    cancelDrag();
    setTimeout(() => {
      contextMenuSuppressed.current = false;
    }, 0);
  }, [cancelDrag]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && internalRef.current?.status === 'dragging') {
        e.preventDefault();
        cancelDrag();
        setTimeout(() => {
          contextMenuSuppressed.current = false;
        }, 0);
      }
    },
    [cancelDrag]
  );

  const handleContextMenu = useCallback((e: Event) => {
    if (contextMenuSuppressed.current) {
      e.preventDefault();
    }
  }, []);

  // Register/unregister global listeners when drag is active
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
  }, [
    dragState.status,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleKeyDown,
    handleContextMenu,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const internal = internalRef.current;
      if (internal?.scrollTimerId != null) {
        cancelAnimationFrame(internal.scrollTimerId);
      }
    };
  }, []);

  // --- Public API ---

  const getGripProps = useCallback(
    (index: number) => ({
      onPointerDown: (e: React.PointerEvent) => {
        // Only initiate on primary button (left click / touch)
        if (e.button !== 0) return;

        const container = containerRef.current;
        if (!container) return;

        const target = e.currentTarget as HTMLElement;
        gripElementRef.current = target;

        // Set pointer capture for cross-boundary tracking
        try {
          target.setPointerCapture(e.pointerId);
        } catch {
          // fallback: continue without capture
        }

        // Initialize internal state
        internalRef.current = {
          status: 'tracking',
          dragIndex: index,
          startY: e.clientY,
          startX: e.clientX,
          currentY: e.clientY,
          currentX: e.clientX,
          dropIndex: index,
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

        // Prevent text selection during drag
        e.preventDefault();
      },
      'aria-roledescription': 'sortable' as const,
      style: { touchAction: 'none' } as React.CSSProperties,
    }),
    [containerRef]
  );

  const getItemProps = useCallback(
    (index: number) => {
      const isDragging =
        dragState.status === 'dragging' && dragState.dragIndex === index;

      return {
        'data-drag-item': '',
        className: isDragging ? 'drag-item-dragging' : undefined,
        style: isDragging
          ? ({
              transform: `translate(${dragState.offsetX}px, ${dragState.offsetY}px)`,
              zIndex: 9999,
              position: 'relative' as const,
              opacity: 0.9,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'box-shadow 0.2s',
            } as React.CSSProperties)
          : undefined,
        'aria-grabbed': isDragging ? true : undefined,
      };
    },
    [dragState]
  );

  const dropIndicatorIndex =
    dragState.status === 'dragging' ? dragState.dropIndex : null;

  return {
    dragState,
    getGripProps,
    getItemProps,
    dropIndicatorIndex,
    announcementText,
  };
}
