import { describe, it, expect } from 'vitest';
import { CONDITION_COLORS, CONDITION_COLOR_FALLBACK, getConditionIntensity } from '../condition-colors';
import { CONDITIONS } from '../conditions';

describe('CONDITION_COLORS', () => {
  it('maps all 12 known conditions', () => {
    const expectedConditions = [
      'Bleeding', 'Ablaze', 'Poisoned', 'Stunned', 'Surprised',
      'Fatigued', 'Prone', 'Broken', 'Blinded', 'Deafened',
      'Entangled', 'Unconscious',
    ];
    for (const name of expectedConditions) {
      expect(CONDITION_COLORS[name]).toBeDefined();
      expect(CONDITION_COLORS[name].bg).toBeTruthy();
      expect(CONDITION_COLORS[name].text).toBeTruthy();
    }
  });

  it('every condition in CONDITIONS data has a color mapping', () => {
    for (const cond of CONDITIONS) {
      expect(CONDITION_COLORS[cond.name]).toBeDefined();
    }
  });

  it('fallback provides neutral grey with white text', () => {
    expect(CONDITION_COLOR_FALLBACK.bg).toBe('#6b7280');
    expect(CONDITION_COLOR_FALLBACK.text).toBe('#fff');
  });

  describe('contrast ratio compliance (4.5:1 minimum)', () => {
    // Helper to compute relative luminance from hex color
    function hexToRgb(hex: string): [number, number, number] {
      let h = hex.replace('#', '');
      // Expand 3-digit shorthand to 6-digit
      if (h.length === 3) {
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      }
      return [
        parseInt(h.substring(0, 2), 16),
        parseInt(h.substring(2, 4), 16),
        parseInt(h.substring(4, 6), 16),
      ];
    }

    function relativeLuminance(rgb: [number, number, number]): number {
      const [r, g, b] = rgb.map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function contrastRatio(hex1: string, hex2: string): number {
      const l1 = relativeLuminance(hexToRgb(hex1));
      const l2 = relativeLuminance(hexToRgb(hex2));
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    for (const [name, color] of Object.entries(CONDITION_COLORS)) {
      it(`${name}: bg ${color.bg} / text ${color.text} meets 4.5:1 ratio`, () => {
        const ratio = contrastRatio(color.bg, color.text);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    }
  });
});

describe('getConditionIntensity', () => {
  it('returns 1.0 for non-stackable conditions', () => {
    expect(getConditionIntensity(1, 1, false)).toBe(1.0);
  });

  it('returns 1.0 for stackable conditions at level 1', () => {
    expect(getConditionIntensity(1, 10, true)).toBe(1.0);
  });

  it('returns value > 0.5 for stackable at level > 1', () => {
    const result = getConditionIntensity(2, 10, true);
    expect(result).toBeGreaterThan(0.5);
    expect(result).toBeLessThan(1.0);
  });

  it('returns 1.0 for stackable at max level', () => {
    expect(getConditionIntensity(10, 10, true)).toBe(1.0);
  });

  it('scales proportionally: higher level = higher intensity', () => {
    const low = getConditionIntensity(2, 10, true);
    const mid = getConditionIntensity(5, 10, true);
    const high = getConditionIntensity(8, 10, true);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  it('returns 1.0 when maxLevel is 1 (edge case)', () => {
    expect(getConditionIntensity(1, 1, true)).toBe(1.0);
  });
});
