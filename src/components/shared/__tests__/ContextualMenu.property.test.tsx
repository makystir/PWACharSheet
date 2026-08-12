import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Feature: ux-polish-improvements, Property 6: Contextual menu viewport containment

/**
 * Replicates the clamping logic from ContextualMenu's useEffect:
 *   clampedLeft = Math.min(x, viewportWidth - menuWidth)
 *   clampedTop  = Math.min(y, viewportHeight - menuHeight)
 *   finalLeft   = Math.max(0, clampedLeft)
 *   finalTop    = Math.max(0, clampedTop)
 */
function clampMenuPosition(
  x: number,
  y: number,
  menuWidth: number,
  menuHeight: number,
  viewportWidth: number,
  viewportHeight: number
): { finalLeft: number; finalTop: number } {
  const clampedLeft = Math.min(x, viewportWidth - menuWidth);
  const clampedTop = Math.min(y, viewportHeight - menuHeight);
  return {
    finalLeft: Math.max(0, clampedLeft),
    finalTop: Math.max(0, clampedTop),
  };
}

// ─── Generators ─────────────────────────────────────────────────────────────

/** Touch x coordinate: 0–2000 */
const arbX = fc.integer({ min: 0, max: 2000 });

/** Touch y coordinate: 0–2000 */
const arbY = fc.integer({ min: 0, max: 2000 });

/** Menu width: 100–300 */
const arbMenuWidth = fc.integer({ min: 100, max: 300 });

/** Menu height: 50–200 */
const arbMenuHeight = fc.integer({ min: 50, max: 200 });

/** Viewport width: 320–1920 */
const arbViewportWidth = fc.integer({ min: 320, max: 1920 });

/** Viewport height: 480–1080 */
const arbViewportHeight = fc.integer({ min: 480, max: 1080 });

// ─── Property Test ──────────────────────────────────────────────────────────

describe('Feature: ux-polish-improvements', () => {
  describe('Property 6: Contextual menu viewport containment', () => {
    /**
     * **Validates: Requirements 8.2**
     *
     * For any touch coordinates (x, y) that trigger a contextual menu, the menu's
     * final rendered position SHALL be contained entirely within the viewport
     * boundaries (0 ≤ left, top ≥ 0, right ≤ window.innerWidth,
     * bottom ≤ window.innerHeight).
     */
    it('menu final position is always fully contained within viewport boundaries', () => {
      fc.assert(
        fc.property(
          arbX,
          arbY,
          arbMenuWidth,
          arbMenuHeight,
          arbViewportWidth,
          arbViewportHeight,
          (x, y, menuWidth, menuHeight, viewportWidth, viewportHeight) => {
            const { finalLeft, finalTop } = clampMenuPosition(
              x,
              y,
              menuWidth,
              menuHeight,
              viewportWidth,
              viewportHeight
            );

            // Left edge: must be >= 0
            expect(finalLeft).toBeGreaterThanOrEqual(0);

            // Top edge: must be >= 0
            expect(finalTop).toBeGreaterThanOrEqual(0);

            // Right edge: finalLeft + menuWidth must be <= viewportWidth
            expect(finalLeft + menuWidth).toBeLessThanOrEqual(viewportWidth);

            // Bottom edge: finalTop + menuHeight must be <= viewportHeight
            expect(finalTop + menuHeight).toBeLessThanOrEqual(viewportHeight);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('menu positioned at origin stays at origin when viewport is large enough', () => {
      fc.assert(
        fc.property(
          arbMenuWidth,
          arbMenuHeight,
          arbViewportWidth,
          arbViewportHeight,
          (menuWidth, menuHeight, viewportWidth, viewportHeight) => {
            const { finalLeft, finalTop } = clampMenuPosition(
              0,
              0,
              menuWidth,
              menuHeight,
              viewportWidth,
              viewportHeight
            );

            // At (0, 0), the menu should start at (0, 0) since viewport
            // is always >= menu dimensions given our generator ranges
            // (viewportWidth min 320 > menuWidth max 300,
            //  viewportHeight min 480 > menuHeight max 200)
            expect(finalLeft).toBe(0);
            expect(finalTop).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('menu near bottom-right corner is pulled back into viewport', () => {
      fc.assert(
        fc.property(
          arbMenuWidth,
          arbMenuHeight,
          arbViewportWidth,
          arbViewportHeight,
          (menuWidth, menuHeight, viewportWidth, viewportHeight) => {
            // Place touch at the extreme bottom-right corner
            const x = viewportWidth;
            const y = viewportHeight;

            const { finalLeft, finalTop } = clampMenuPosition(
              x,
              y,
              menuWidth,
              menuHeight,
              viewportWidth,
              viewportHeight
            );

            // Menu must still fit within viewport
            expect(finalLeft).toBeGreaterThanOrEqual(0);
            expect(finalTop).toBeGreaterThanOrEqual(0);
            expect(finalLeft + menuWidth).toBeLessThanOrEqual(viewportWidth);
            expect(finalTop + menuHeight).toBeLessThanOrEqual(viewportHeight);

            // The clamped position should be exactly at the edge
            expect(finalLeft).toBe(viewportWidth - menuWidth);
            expect(finalTop).toBe(viewportHeight - menuHeight);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
