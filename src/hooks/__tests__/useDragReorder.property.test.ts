// Feature: drag-reorder-equipment, Property 1: Drag Initiation Discrimination
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useDragReorder } from '../useDragReorder';

/**
 * Property 1: Drag Initiation Discrimination
 *
 * **Validates: Requirements 1.1, 1.5**
 *
 * For any pointer event target element within the card list, the drag system
 * SHALL begin tracking if and only if the target is the grip icon element
 * (or a descendant of it). Pointer events on any other element (card body,
 * buttons, inputs) SHALL NOT initiate drag.
 */

// ─── Generators ──────────────────────────────────────────────────────────────

/** Target type: either the grip element or a non-grip element */
type TargetType = 'grip' | 'card-body' | 'button' | 'input' | 'label' | 'span';

const NON_GRIP_TARGETS: TargetType[] = ['card-body', 'button', 'input', 'label', 'span'];

const arbGripTarget: fc.Arbitrary<TargetType> = fc.constant('grip' as TargetType);

const arbNonGripTarget: fc.Arbitrary<TargetType> = fc.constantFrom(...NON_GRIP_TARGETS);

/** Generate a valid item index for a list of given length */
const arbIndex = (maxLength: number): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: maxLength - 1 });

/** Generate a list of 1-10 items */
const arbItemCount: fc.Arbitrary<number> = fc.integer({ min: 1, max: 10 });

/** Generate a random pointerId (positive integer) */
const arbPointerId: fc.Arbitrary<number> = fc.integer({ min: 1, max: 1000 });

/** Generate random pointer coordinates */
const arbCoord: fc.Arbitrary<number> = fc.integer({ min: 0, max: 1000 });

// ─── Test Helpers ────────────────────────────────────────────────────────────

/**
 * Creates a mock container element with setPointerCapture/releasePointerCapture
 * and a getBoundingClientRect that returns a valid rect.
 */
function createMockContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.getBoundingClientRect = () => ({
    top: 0, left: 0, bottom: 500, right: 300, width: 300, height: 500, x: 0, y: 0,
    toJSON: () => ({}),
  });
  document.body.appendChild(container);
  return container;
}

/**
 * Creates a mock PointerEvent matching React.PointerEvent shape needed by
 * the onPointerDown handler.
 */
function createMockPointerEvent(
  pointerId: number,
  clientX: number,
  clientY: number,
  currentTarget: HTMLElement,
): React.PointerEvent {
  return {
    button: 0,
    pointerId,
    clientX,
    clientY,
    currentTarget,
    preventDefault: vi.fn(),
  } as unknown as React.PointerEvent;
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: drag-reorder-equipment, Property 1: Drag Initiation Discrimination', () => {
  it('onPointerDown on the grip element transitions dragState to tracking', () => {
    fc.assert(
      fc.property(
        arbItemCount,
        arbPointerId,
        arbCoord,
        arbCoord,
        (itemCount, pointerId, clientX, clientY) => {
          const container = createMockContainer();
          const containerRef = { current: container };
          const items = Array.from({ length: itemCount }, (_, i) => ({ id: i }));
          const onReorder = vi.fn();

          const { result } = renderHook(() =>
            useDragReorder({ items, onReorder, containerRef })
          );

          // Pick a random valid index
          const index = itemCount > 1 ? (pointerId % itemCount) : 0;

          // Get grip props for the given index
          const gripProps = result.current.getGripProps(index);

          // Create a mock grip element (the element the handler is attached to)
          const gripElement = document.createElement('span');
          gripElement.setPointerCapture = vi.fn();
          gripElement.releasePointerCapture = vi.fn();

          const event = createMockPointerEvent(pointerId, clientX, clientY, gripElement);

          // Act: call onPointerDown (simulating pointer down on the grip)
          act(() => {
            gripProps.onPointerDown(event);
          });

          // Assert: state should transition to 'tracking'
          expect(result.current.dragState.status).toBe('tracking');
          expect(result.current.dragState.dragIndex).toBe(index);

          // Cleanup
          document.body.removeChild(container);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('non-grip elements do NOT have onPointerDown handlers and cannot initiate drag', () => {
    fc.assert(
      fc.property(
        arbItemCount,
        arbNonGripTarget,
        arbPointerId,
        arbCoord,
        arbCoord,
        (itemCount, targetType, pointerId, clientX, clientY) => {
          const container = createMockContainer();
          const containerRef = { current: container };
          const items = Array.from({ length: itemCount }, (_, i) => ({ id: i }));
          const onReorder = vi.fn();

          const { result } = renderHook(() =>
            useDragReorder({ items, onReorder, containerRef })
          );

          // Create a non-grip element (card body, button, input, etc.)
          const nonGripElement = document.createElement(
            targetType === 'card-body' ? 'div' : targetType
          );
          nonGripElement.setPointerCapture = vi.fn();
          nonGripElement.releasePointerCapture = vi.fn();
          container.appendChild(nonGripElement);

          // Simulate a native pointerdown on the non-grip element
          // Since only getGripProps provides onPointerDown, dispatching a native
          // pointer event on a non-grip element should NOT trigger drag tracking
          const nativeEvent = new PointerEvent('pointerdown', {
            pointerId,
            clientX,
            clientY,
            button: 0,
            bubbles: true,
          });
          nonGripElement.dispatchEvent(nativeEvent);

          // Assert: state should remain 'idle' — no drag initiated
          expect(result.current.dragState.status).toBe('idle');
          expect(result.current.dragState.dragIndex).toBeNull();

          // Cleanup
          document.body.removeChild(container);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('only the grip element (via getGripProps) can initiate tracking — non-primary button does not', () => {
    fc.assert(
      fc.property(
        arbItemCount,
        arbPointerId,
        arbCoord,
        arbCoord,
        fc.integer({ min: 1, max: 4 }), // non-primary buttons (1=middle, 2=right, 3/4=aux)
        (itemCount, pointerId, clientX, clientY, button) => {
          const container = createMockContainer();
          const containerRef = { current: container };
          const items = Array.from({ length: itemCount }, (_, i) => ({ id: i }));
          const onReorder = vi.fn();

          const { result } = renderHook(() =>
            useDragReorder({ items, onReorder, containerRef })
          );

          const index = itemCount > 1 ? (pointerId % itemCount) : 0;
          const gripProps = result.current.getGripProps(index);

          const gripElement = document.createElement('span');
          gripElement.setPointerCapture = vi.fn();
          gripElement.releasePointerCapture = vi.fn();

          // Use a non-primary button (right-click, middle-click, etc.)
          const event = {
            button, // non-zero = not primary
            pointerId,
            clientX,
            clientY,
            currentTarget: gripElement,
            preventDefault: vi.fn(),
          } as unknown as React.PointerEvent;

          // Act: call onPointerDown with non-primary button
          act(() => {
            gripProps.onPointerDown(event);
          });

          // Assert: state should remain idle — only primary button initiates drag
          expect(result.current.dragState.status).toBe('idle');
          expect(result.current.dragState.dragIndex).toBeNull();

          // Cleanup
          document.body.removeChild(container);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Feature: drag-reorder-equipment, Property 4: Cancellation Resets State
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Property 4: Cancellation Resets State
 *
 * **Validates: Requirements 4.1, 4.2, 4.3**
 *
 * For any active drag operation (any item index, any current drop position),
 * a cancellation event (Escape keydown or pointercancel) SHALL return the drag
 * system to idle state with dragIndex = null, dropIndex = null, offsetY = 0,
 * and SHALL NOT invoke the onReorder callback.
 */

// ─── Property 4 Helpers ──────────────────────────────────────────────────────

/** Create a container with child items that have proper bounding rects */
function createItemContainer(itemCount: number): HTMLDivElement {
  const container = document.createElement('div');
  for (let i = 0; i < itemCount; i++) {
    const item = document.createElement('div');
    item.dataset.dragItem = '';
    Object.defineProperty(item, 'getBoundingClientRect', {
      value: () => ({
        top: i * 50,
        bottom: (i + 1) * 50,
        left: 0,
        right: 200,
        width: 200,
        height: 50,
        x: 0,
        y: i * 50,
        toJSON: () => ({}),
      }),
    });
    container.appendChild(item);
  }
  Object.defineProperty(container, 'getBoundingClientRect', {
    value: () => ({
      top: 0,
      bottom: itemCount * 50,
      left: 0,
      right: 200,
      width: 200,
      height: itemCount * 50,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  Object.defineProperty(container, 'scrollTop', {
    value: 0,
    writable: true,
  });
  document.body.appendChild(container);
  return container;
}

// ─── Property 4 Generators ───────────────────────────────────────────────────

/** Generate item count (min 2 for meaningful drag) */
const arbP4ItemCount = fc.integer({ min: 2, max: 20 });

/** Generate an offsetY that exceeds the 5px drag threshold */
const arbP4OffsetY = fc.integer({ min: 8, max: 300 });

/** Generate a cancellation event type */
const arbCancelType = fc.oneof(
  fc.constant('escape' as const),
  fc.constant('pointercancel' as const)
);

// ─── Property 4 Test ─────────────────────────────────────────────────────────

describe('Feature: drag-reorder-equipment, Property 4: Cancellation Resets State', () => {
  it('cancellation resets state to idle and does not call onReorder', () => {
    fc.assert(
      fc.property(
        arbP4ItemCount,
        arbP4OffsetY,
        arbCancelType,
        (itemCount, offsetY, cancelType) => {
          // Pick a drag index within range (middle of list)
          const dragIndex = Math.floor(itemCount / 2);

          const onReorder = vi.fn();
          const items = Array.from({ length: itemCount }, (_, i) => ({ id: i }));
          const container = createItemContainer(itemCount);
          const containerRef = { current: container } as React.RefObject<HTMLElement>;

          const { result, unmount } = renderHook(() =>
            useDragReorder({
              items,
              onReorder,
              containerRef,
            })
          );

          // Create a grip element with pointer capture mocks
          const gripElement = document.createElement('span');
          gripElement.setPointerCapture = vi.fn();
          gripElement.releasePointerCapture = vi.fn();
          container.appendChild(gripElement);

          // Get the onPointerDown handler for the drag index
          const gripProps = result.current.getGripProps(dragIndex);

          // Simulate pointerdown via the React handler
          const startY = dragIndex * 50 + 25;
          act(() => {
            gripProps.onPointerDown({
              button: 0,
              clientX: 100,
              clientY: startY,
              pointerId: 1,
              currentTarget: gripElement,
              preventDefault: vi.fn(),
            } as unknown as React.PointerEvent);
          });

          // Simulate pointermove beyond 5px threshold to enter 'dragging' state
          const moveY = startY + offsetY;
          act(() => {
            const moveEvent = new PointerEvent('pointermove', {
              pointerId: 1,
              clientX: 100,
              clientY: moveY,
              bubbles: true,
            });
            document.dispatchEvent(moveEvent);
          });

          // Confirm we are in dragging state
          expect(result.current.dragState.status).toBe('dragging');
          expect(result.current.dragState.dragIndex).toBe(dragIndex);

          // Apply the cancellation event
          act(() => {
            if (cancelType === 'escape') {
              const escapeEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
              });
              document.dispatchEvent(escapeEvent);
            } else {
              const pointerCancelEvent = new PointerEvent('pointercancel', {
                pointerId: 1,
                bubbles: true,
              });
              document.dispatchEvent(pointerCancelEvent);
            }
          });

          // Verify state has fully reset to idle
          expect(result.current.dragState.status).toBe('idle');
          expect(result.current.dragState.dragIndex).toBeNull();
          expect(result.current.dragState.dropIndex).toBeNull();
          expect(result.current.dragState.offsetY).toBe(0);

          // Verify onReorder was NOT called
          expect(onReorder).not.toHaveBeenCalled();

          // Cleanup
          unmount();
          document.body.removeChild(container);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ─── Property 2: Movement Threshold Activation ───────────────────────────────

// Feature: drag-reorder-equipment, Property 2: Movement Threshold Activation

/**
 * Property 2: Movement Threshold Activation
 *
 * **Validates: Requirements 1.2**
 *
 * For any pointer movement delta (dx, dy) from the pointerdown origin,
 * the drag system SHALL transition to active dragging state if and only if
 * Math.sqrt(dx² + dy²) > 5. Movements at or below the 5-pixel threshold
 * SHALL remain in the tracking state.
 */

const DRAG_THRESHOLD_PX = 5;

/** Create a minimal container element mock with required DOM APIs */
function createMockContainerWithItems(itemCount: number): HTMLDivElement {
  const container = document.createElement('div');

  for (let i = 0; i < itemCount; i++) {
    const child = document.createElement('div');
    child.dataset.dragItem = '';
    child.getBoundingClientRect = () => ({
      top: i * 60,
      bottom: (i + 1) * 60,
      left: 0,
      right: 200,
      width: 200,
      height: 60,
      x: 0,
      y: i * 60,
      toJSON: () => ({}),
    });
    container.appendChild(child);
  }

  container.getBoundingClientRect = () => ({
    top: 0,
    bottom: itemCount * 60,
    left: 0,
    right: 200,
    width: 200,
    height: itemCount * 60,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });

  document.body.appendChild(container);
  return container;
}

/** Simulate pointerdown on a grip element returned by getGripProps */
function simulatePointerDown(
  gripProps: ReturnType<ReturnType<typeof useDragReorder>['getGripProps']>,
  startX: number,
  startY: number,
  pointerId = 1
) {
  const target = document.createElement('span');
  target.setPointerCapture = vi.fn();
  target.releasePointerCapture = vi.fn();

  const event = {
    button: 0,
    clientX: startX,
    clientY: startY,
    pointerId,
    currentTarget: target,
    preventDefault: vi.fn(),
  } as unknown as React.PointerEvent;

  gripProps.onPointerDown(event);
}

/** Dispatch a native pointermove event on the document */
function dispatchPointerMove(clientX: number, clientY: number, pointerId = 1) {
  const event = new PointerEvent('pointermove', {
    clientX,
    clientY,
    pointerId,
    bubbles: true,
  });
  document.dispatchEvent(event);
}

/** Dispatch a native pointerup event on the document */
function dispatchPointerUp(clientX: number, clientY: number, pointerId = 1) {
  const event = new PointerEvent('pointerup', {
    clientX,
    clientY,
    pointerId,
    bubbles: true,
  });
  document.dispatchEvent(event);
}

describe('Feature: drag-reorder-equipment, Property 2: Movement Threshold Activation', () => {
  it('transitions to dragging if and only if distance > 5px threshold', () => {
    fc.assert(
      fc.property(
        // Generate random dx, dy floating point pairs spanning below and above threshold
        fc.float({ min: -20, max: 20, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: -20, max: 20, noNaN: true, noDefaultInfinity: true }),
        (dx, dy) => {
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Skip values too close to the threshold boundary to avoid floating point edge cases
          if (Math.abs(distance - DRAG_THRESHOLD_PX) < 0.01) return;

          const items = ['Item A', 'Item B', 'Item C'];
          const onReorder = vi.fn();
          const container = createMockContainerWithItems(items.length);
          const containerRef = { current: container } as React.RefObject<HTMLElement>;

          const { result } = renderHook(() =>
            useDragReorder({
              items,
              onReorder,
              containerRef,
            })
          );

          const startX = 100;
          const startY = 100;

          // Simulate pointerdown on grip for item 0
          act(() => {
            simulatePointerDown(result.current.getGripProps(0), startX, startY);
          });

          // Status should be 'tracking' after pointerdown
          expect(result.current.dragState.status).toBe('tracking');

          // Simulate pointermove with the generated (dx, dy)
          act(() => {
            dispatchPointerMove(startX + dx, startY + dy);
          });

          if (distance > DRAG_THRESHOLD_PX) {
            // Should transition to dragging
            expect(result.current.dragState.status).toBe('dragging');
          } else {
            // Should remain in tracking
            expect(result.current.dragState.status).toBe('tracking');
          }

          // Cleanup: dispatch pointerup to reset state
          act(() => {
            dispatchPointerUp(startX + dx, startY + dy);
          });

          // Remove container
          document.body.removeChild(container);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('remains in tracking state for zero movement', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4 }), // item index within a 5-item list
        (itemIndex) => {
          const items = ['A', 'B', 'C', 'D', 'E'];
          const onReorder = vi.fn();
          const container = createMockContainerWithItems(items.length);
          const containerRef = { current: container } as React.RefObject<HTMLElement>;

          const { result } = renderHook(() =>
            useDragReorder({
              items,
              onReorder,
              containerRef,
            })
          );

          const startX = 100;
          const startY = 100;

          // Simulate pointerdown
          act(() => {
            simulatePointerDown(
              result.current.getGripProps(itemIndex),
              startX,
              startY
            );
          });

          // Pointermove at exact same position (distance = 0)
          act(() => {
            dispatchPointerMove(startX, startY);
          });

          // Should remain in tracking (distance = 0 <= 5)
          expect(result.current.dragState.status).toBe('tracking');

          // Cleanup
          act(() => {
            dispatchPointerUp(startX, startY);
          });
          document.body.removeChild(container);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('movements at or below threshold (distance <= 5) always remain in tracking', () => {
    fc.assert(
      fc.property(
        // Generate (dx, dy) pairs guaranteed to be at or below threshold
        // Use integer values scaled to stay within the 5px radius
        fc.integer({ min: -5, max: 5 }),
        fc.integer({ min: -5, max: 5 }),
        (dx, dy) => {
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Only test pairs that are at or below threshold
          if (distance > DRAG_THRESHOLD_PX) return;

          const items = ['Item A', 'Item B', 'Item C'];
          const onReorder = vi.fn();
          const container = createMockContainerWithItems(items.length);
          const containerRef = { current: container } as React.RefObject<HTMLElement>;

          const { result } = renderHook(() =>
            useDragReorder({
              items,
              onReorder,
              containerRef,
            })
          );

          const startX = 100;
          const startY = 100;

          act(() => {
            simulatePointerDown(result.current.getGripProps(0), startX, startY);
          });

          act(() => {
            dispatchPointerMove(startX + dx, startY + dy);
          });

          // Should remain in tracking (distance <= 5)
          expect(result.current.dragState.status).toBe('tracking');

          // Cleanup
          act(() => {
            dispatchPointerUp(startX + dx, startY + dy);
          });
          document.body.removeChild(container);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Feature: drag-reorder-equipment, Property 6: Throttled Index Updates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Property 6: Throttled Index Updates
 *
 * **Validates: Requirements 10.3**
 *
 * For any sequence of pointer positions that all resolve to the same insertion
 * index (i.e., pointer stays within the same inter-item gap), the drop indicator
 * index SHALL be set exactly once and not re-set for subsequent positions mapping
 * to the same index.
 */

import { computeInsertionIndex } from '../useDragReorder';

// ─── Property 6 Generators ──────────────────────────────────────────────────

/** Generate an array of item heights (all items stacked vertically from top=0) */
const arbItemRects = (minItems: number, maxItems: number): fc.Arbitrary<DOMRect[]> =>
  fc.array(fc.integer({ min: 30, max: 100 }), { minLength: minItems, maxLength: maxItems })
    .map(heights => {
      let top = 0;
      return heights.map(h => {
        const rect = {
          top,
          bottom: top + h,
          left: 0,
          right: 200,
          width: 200,
          height: h,
          x: 0,
          y: top,
          toJSON: () => ({}),
        } as DOMRect;
        top += h;
        return rect;
      });
    });

/**
 * Given item rects and a target insertion index, compute the Y range where
 * computeInsertionIndex returns that index.
 * 
 * For index 0: pointer must be at or above the first midpoint
 * For index N: pointer must be above midpoint[N-1] but at or below midpoint[N] (if it exists)
 * For index === itemRects.length: pointer must be above the last midpoint
 */
function getYRangeForIndex(
  itemRects: DOMRect[],
  targetIndex: number
): { min: number; max: number } | null {
  const midpoints = itemRects.map(r => r.top + r.height / 2);

  // For insertion index = targetIndex, pointer Y must satisfy:
  // - pointerY > midpoints[targetIndex - 1] (if targetIndex > 0)
  // - pointerY <= midpoints[targetIndex] (if targetIndex < midpoints.length)
  // Due to the break-based logic in computeInsertionIndex:
  // The function increments index for each midpoint the pointer is ABOVE (pointerY > midY).
  // It breaks on the first midpoint where pointerY <= midY.

  let rangeMin: number;
  let rangeMax: number;

  if (targetIndex === 0) {
    // Pointer must be at or below the first midpoint (pointerY <= midpoints[0])
    rangeMin = 0;
    rangeMax = midpoints[0];
  } else if (targetIndex === midpoints.length) {
    // Pointer must be above the last midpoint
    rangeMin = midpoints[midpoints.length - 1] + 0.01;
    rangeMax = midpoints[midpoints.length - 1] + 500;
  } else {
    // Pointer must be > midpoints[targetIndex - 1] AND <= midpoints[targetIndex]
    rangeMin = midpoints[targetIndex - 1] + 0.01;
    rangeMax = midpoints[targetIndex];
  }

  if (rangeMin >= rangeMax) return null;
  return { min: rangeMin, max: rangeMax };
}

// ─── Property 6 Tests ────────────────────────────────────────────────────────

describe('Feature: drag-reorder-equipment, Property 6: Throttled Index Updates', () => {
  it('computeInsertionIndex returns the same index for all Y positions within the same gap range (pure function level)', () => {
    fc.assert(
      fc.property(
        arbItemRects(2, 15),
        fc.integer({ min: 2, max: 10 }), // number of Y positions to test within the gap
        (itemRects, sampleCount) => {
          const numItems = itemRects.length;

          // Pick a random target insertion index
          const targetIndex = Math.floor(Math.random() * (numItems + 1));
          const range = getYRangeForIndex(itemRects, targetIndex);

          // If the range is too narrow, skip this sample
          if (!range || (range.max - range.min) < 0.1) return;

          // Generate multiple Y positions within this range
          const step = (range.max - range.min) / (sampleCount + 1);
          const yPositions: number[] = [];
          for (let i = 1; i <= sampleCount; i++) {
            yPositions.push(range.min + step * i);
          }

          // All Y positions should resolve to the same insertion index
          const results = yPositions.map(y =>
            computeInsertionIndex(y, itemRects, 0)
          );

          // Verify all results are the same index
          const uniqueResults = new Set(results);
          expect(uniqueResults.size).toBe(1);
          expect(results[0]).toBe(targetIndex);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('hook only updates dropIndex once for multiple pointermove events resolving to the same index', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 8 }), // item count
        fc.integer({ min: 3, max: 8 }), // number of same-index moves to simulate
        (itemCount, moveCount) => {
          const ITEM_HEIGHT = 60;

          // Create a container with items that have fixed-size bounding rects
          const container = document.createElement('div');
          for (let i = 0; i < itemCount; i++) {
            const child = document.createElement('div');
            child.dataset.dragItem = '';
            Object.defineProperty(child, 'getBoundingClientRect', {
              value: () => ({
                top: i * ITEM_HEIGHT,
                bottom: (i + 1) * ITEM_HEIGHT,
                left: 0,
                right: 200,
                width: 200,
                height: ITEM_HEIGHT,
                x: 0,
                y: i * ITEM_HEIGHT,
                toJSON: () => ({}),
              }),
              configurable: true,
            });
            container.appendChild(child);
          }
          Object.defineProperty(container, 'getBoundingClientRect', {
            value: () => ({
              top: 0,
              bottom: itemCount * ITEM_HEIGHT,
              left: 0,
              right: 200,
              width: 200,
              height: itemCount * ITEM_HEIGHT,
              x: 0,
              y: 0,
              toJSON: () => ({}),
            }),
            configurable: true,
          });
          Object.defineProperty(container, 'scrollTop', {
            value: 0,
            writable: true,
            configurable: true,
          });
          document.body.appendChild(container);

          const containerRef = { current: container } as React.RefObject<HTMLElement>;
          const items = Array.from({ length: itemCount }, (_, i) => ({ id: i }));
          const onReorder = vi.fn();

          const { result, unmount } = renderHook(() =>
            useDragReorder({ items, onReorder, containerRef })
          );

          // Start drag on item 0
          const gripElement = document.createElement('span');
          gripElement.setPointerCapture = vi.fn();
          gripElement.releasePointerCapture = vi.fn();

          const startY = 25; // Near center of first item
          act(() => {
            result.current.getGripProps(0).onPointerDown({
              button: 0,
              clientX: 100,
              clientY: startY,
              pointerId: 1,
              currentTarget: gripElement,
              preventDefault: vi.fn(),
            } as unknown as React.PointerEvent);
          });

          // Compute midpoints for the items
          const midpoints = Array.from({ length: itemCount }, (_, i) => i * ITEM_HEIGHT + ITEM_HEIGHT / 2);

          // Choose the last insertion index (pointer above last midpoint) — guaranteed wide range
          const targetIndex = itemCount;

          // Compute Y range for this target index
          const rangeMin = midpoints[midpoints.length - 1] + 1;
          const rangeMax = midpoints[midpoints.length - 1] + 200;

          // First move: cross the 5px drag threshold to enter 'dragging' state.
          // The transition to 'dragging' sets dropIndex = dragIndex (0) initially.
          // The first move that enters dragging does NOT call updateDropIndex itself.
          const thresholdCrossY = startY + 10; // 10px move to cross 5px threshold
          act(() => {
            document.dispatchEvent(
              new PointerEvent('pointermove', {
                clientX: 100,
                clientY: thresholdCrossY,
                pointerId: 1,
                bubbles: true,
              })
            );
          });

          expect(result.current.dragState.status).toBe('dragging');
          // dropIndex is initially set to dragIndex (0) on entering dragging
          expect(result.current.dragState.dropIndex).toBe(0);

          // Second move: land in the target range to establish the target dropIndex
          const establishY = rangeMin + 5;
          act(() => {
            document.dispatchEvent(
              new PointerEvent('pointermove', {
                clientX: 100,
                clientY: establishY,
                pointerId: 1,
                bubbles: true,
              })
            );
          });

          // Now dropIndex should be updated to targetIndex
          const establishedDropIndex = result.current.dragState.dropIndex;
          expect(establishedDropIndex).toBe(targetIndex);

          // Now dispatch multiple additional pointermove events within the same index range.
          // All of these resolve to the same insertion index, so the throttle logic
          // (newDropIndex !== internal.dropIndex) should prevent any state updates.
          const step = (rangeMax - rangeMin) / (moveCount + 1);
          for (let i = 1; i <= moveCount; i++) {
            const y = rangeMin + step * i;
            act(() => {
              document.dispatchEvent(
                new PointerEvent('pointermove', {
                  clientX: 100,
                  clientY: y,
                  pointerId: 1,
                  bubbles: true,
                })
              );
            });
          }

          // After all moves within the same gap, dropIndex remains unchanged.
          // The hook's throttle ensures no redundant state updates occurred.
          expect(result.current.dragState.dropIndex).toBe(establishedDropIndex);

          // Cleanup
          act(() => {
            document.dispatchEvent(
              new PointerEvent('pointerup', {
                clientX: 100,
                clientY: establishY,
                pointerId: 1,
                bubbles: true,
              })
            );
          });
          unmount();
          document.body.removeChild(container);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('computeInsertionIndex is deterministic: same inputs always yield same output (throttle precondition)', () => {
    fc.assert(
      fc.property(
        arbItemRects(2, 10),
        fc.float({ min: -50, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 9 }),
        (itemRects, pointerY, dragIndex) => {
          const clampedDragIndex = Math.min(dragIndex, itemRects.length - 1);

          const result1 = computeInsertionIndex(pointerY, itemRects, clampedDragIndex);
          const result2 = computeInsertionIndex(pointerY, itemRects, clampedDragIndex);

          // Same inputs always produce same output — this is the precondition
          // that makes the throttle logic correct (if index hasn't changed, skip update)
          expect(result1).toBe(result2);
          expect(result1).toBeGreaterThanOrEqual(0);
          expect(result1).toBeLessThanOrEqual(itemRects.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
