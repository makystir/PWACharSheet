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
  draggedElement: HTMLElement | null;
  allItemElements: HTMLElement[];
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

  if (pointerY > closestMidY + closest.height / 2) {
    return Math.min(closestIndex + 1, itemRects.length);
  } else if (pointerY < closestMidY - closest.height / 2) {
    return closestIndex;
  } else {
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

  // Reset to idle — also clean up DOM styles on the dragged element
  const resetState = useCallback(() => {
    const internal = internalRef.current;
    if (internal?.scrollTimerId != null) {
      cancelAnimationFrame(internal.scrollTimerId);
    }
    // Reset inline styles on dragged element
    if (internal?.draggedElement) {
      const el = internal.draggedElement;
      el.style.transform = '';
      el.style.zIndex = '';
      el.style.position = '';
      el.style.opacity = '';
      el.style.boxShadow = '';
      el.style.pointerEvents = '';
    }
    // Reset sibling shifts — re-query in case React replaced elements
    const container = containerRef.current;
    if (container) {
      const items = container.querySelectorAll('[data-drag-item]');
      items.forEach((el) => {
        (el as HTMLElement).style.transform = '';
        (el as HTMLElement).style.transition = '';
      });
    }
    internalRef.current = null;
    setDragState(IDLE_STATE);
  }, [containerRef]);

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

  // Apply transforms to sibling items to "make room" at the drop position.
  // Items between dragIndex and dropIndex shift to fill the gap left by the dragged item.
  const applySlotShifts = useCallback((internal: InternalDragState) => {
    const { dragIndex, dropIndex, itemRects } = internal;
    if (itemRects.length === 0) return;

    // Re-query elements from the DOM
    const container = containerRef.current;
    if (!container) return;
    const elements = Array.from(container.querySelectorAll('[data-drag-item]')) as HTMLElement[];
    if (elements.length === 0) return;

    // Update the stored references
    internal.allItemElements = elements;
    if (elements[dragIndex]) {
      internal.draggedElement = elements[dragIndex];
    }

    const count = Math.min(elements.length, itemRects.length);

    for (let i = 0; i < count; i++) {
      if (i === dragIndex) continue;

      const el = elements[i];
      let shouldShift = false;

      if (dragIndex < dropIndex) {
        // Dragging forward: items between dragIndex and dropIndex shift back one slot
        shouldShift = i > dragIndex && i < dropIndex;
      } else if (dragIndex > dropIndex) {
        // Dragging backward: items between dropIndex and dragIndex shift forward one slot
        shouldShift = i >= dropIndex && i < dragIndex;
      }

      if (shouldShift) {
        const curRect = itemRects[i];
        const targetIdx = dragIndex < dropIndex ? i - 1 : i + 1;

        if (targetIdx >= 0 && targetIdx < itemRects.length) {
          const targetRect = itemRects[targetIdx];
          const shiftX = Math.round(targetRect.left - curRect.left);
          const shiftY = Math.round(targetRect.top - curRect.top);
          el.style.cssText = `transition: transform 0.2s ease; transform: translate(${shiftX}px, ${shiftY}px);`;
        }
      } else {
        el.style.cssText = 'transition: transform 0.2s ease;';
      }
    }
  }, [containerRef]);

  // Compute drop index from pointer position — only triggers re-render when index changes
  const updateDropIndex = useCallback((clientX: number, clientY: number) => {
    const internal = internalRef.current;
    if (!internal) return;

    const newDropIndex = computeInsertionIndex(
      clientY,
      internal.itemRects,
      internal.dragIndex,
      clientX
    );

    // Throttle: only update React state if index actually changed
    if (newDropIndex !== internal.dropIndex) {
      internal.dropIndex = newDropIndex;

      setDragState(prev => ({
        ...prev,
        dropIndex: newDropIndex,
      }));

      // Apply slot shifts after React re-renders (next frame)
      requestAnimationFrame(() => {
        if (internalRef.current) {
          applySlotShifts(internalRef.current);
        }
      });
    }
  }, [applySlotShifts]);

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
            const items = children.filter(child => child.dataset.dragItem !== undefined);
            internal.itemRects = items.map(child => child.getBoundingClientRect());
            internal.containerRect = container.getBoundingClientRect();
            // Store references to all item DOM elements and the dragged one
            internal.allItemElements = items;
            internal.draggedElement = items[internal.dragIndex] || null;
          }

          // Apply dragging styles directly to the DOM element (no React re-render)
          if (internal.draggedElement) {
            const el = internal.draggedElement;
            el.style.zIndex = '9999';
            el.style.position = 'relative';
            el.style.opacity = '0.9';
            el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            el.style.pointerEvents = 'none';
            el.style.transform = `translate(${dx}px, ${dy}px)`;
          }

          // Start auto-scroll
          internal.scrollTimerId = requestAnimationFrame(autoScroll);

          // Suppress context menu for touch
          contextMenuSuppressed.current = true;

          // Only one React state update: status change + initial dropIndex
          setDragState({
            status: 'dragging',
            dragIndex: internal.dragIndex,
            dropIndex: internal.dragIndex,
            offsetX: dx,
            offsetY: dy,
          });
        }
      } else if (internal.status === 'dragging') {
        // Update dragged element transform directly via DOM — no React re-render
        // Re-query in case React replaced the element during a re-render
        if (!internal.draggedElement || !internal.draggedElement.isConnected) {
          const container = containerRef.current;
          if (container) {
            const items = Array.from(container.querySelectorAll('[data-drag-item]')) as HTMLElement[];
            internal.draggedElement = items[internal.dragIndex] || null;
            internal.allItemElements = items;
          }
        }
        if (internal.draggedElement) {
          internal.draggedElement.style.transform = `translate(${dx}px, ${dy}px)`;
          internal.draggedElement.style.zIndex = '9999';
          internal.draggedElement.style.position = 'relative';
          internal.draggedElement.style.opacity = '0.9';
          internal.draggedElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          internal.draggedElement.style.pointerEvents = 'none';
        }

        // Update drop index (only triggers re-render when index changes)
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
          draggedElement: null,
          allItemElements: [],
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

      // Note: actual transform is applied directly to DOM in handlePointerMove
      // for performance. We don't pass style here to avoid React clearing
      // inline styles set via direct DOM manipulation.
      return {
        'data-drag-item': '',
        className: isDragging ? 'drag-item-dragging' : undefined,
        'aria-grabbed': isDragging ? true : undefined,
      };
    },
    [dragState.status, dragState.dragIndex]
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
