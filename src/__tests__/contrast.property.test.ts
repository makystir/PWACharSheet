/**
 * Feature: ux-polish-improvements, Property 8: All text colors meet WCAG AA contrast
 *
 * Property: For any text color CSS variable (--text-primary, --text-secondary,
 * --text-muted, --parchment) in any theme, the contrast ratio against its typical
 * background (--bg-primary, --card-bg) SHALL be at least 4.5:1.
 *
 * **Validates: Requirements 10.4**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── WCAG Contrast Ratio Calculation ────────────────────────────────────────

/**
 * Parse a hex color string (#RRGGBB) into RGB components [0..255].
 */
function parseHex(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

/**
 * Compute the relative luminance of an sRGB color per WCAG 2.1.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Compute the contrast ratio between two colors per WCAG 2.1.
 * Returns a value >= 1 (always lighter/darker ratio).
 */
function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Theme Color Extraction ─────────────────────────────────────────────────

interface ThemeColors {
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  '--parchment': string;
  '--bg-primary': string;
  '--card-bg': string;
}

/**
 * Extract CSS variable definitions from a CSS block string.
 */
function extractVarsFromBlock(block: string): Record<string, string> {
  const variables: Record<string, string> = {};
  const varRegex = /--([\w-]+)\s*:\s*([^;]+)/g;
  let varMatch: RegExpExecArray | null;
  while ((varMatch = varRegex.exec(block)) !== null) {
    variables[`--${varMatch[1]}`] = varMatch[2].trim();
  }
  return variables;
}

/**
 * Extract color variable values from the global CSS for a given theme.
 * Uses a simple approach: find the selector text and then extract the block.
 */
function extractThemeColors(css: string, selector: string): ThemeColors {
  const idx = css.indexOf(selector);
  if (idx === -1) {
    return {
      '--text-primary': '',
      '--text-secondary': '',
      '--text-muted': '',
      '--parchment': '',
      '--bg-primary': '',
      '--card-bg': '',
    };
  }

  // Find the opening brace after the selector
  const braceStart = css.indexOf('{', idx);
  if (braceStart === -1) {
    return {
      '--text-primary': '',
      '--text-secondary': '',
      '--text-muted': '',
      '--parchment': '',
      '--bg-primary': '',
      '--card-bg': '',
    };
  }

  // Find the matching closing brace
  let depth = 0;
  let braceEnd = braceStart;
  for (let i = braceStart; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') depth--;
    if (depth === 0) {
      braceEnd = i;
      break;
    }
  }

  const block = css.slice(braceStart + 1, braceEnd);
  const variables = extractVarsFromBlock(block);

  return {
    '--text-primary': variables['--text-primary'] || '',
    '--text-secondary': variables['--text-secondary'] || '',
    '--text-muted': variables['--text-muted'] || '',
    '--parchment': variables['--parchment'] || '',
    '--bg-primary': variables['--bg-primary'] || '',
    '--card-bg': variables['--card-bg'] || '',
  };
}

// ─── Load CSS and Extract All Themes ────────────────────────────────────────

const cssPath = resolve(__dirname, '../styles/global.css');
const cssContent = readFileSync(cssPath, 'utf-8');

const themes: Record<string, ThemeColors> = {
  'default (dark)': extractThemeColors(cssContent, ':root'),
  'light': extractThemeColors(cssContent, '[data-theme="light"]'),
  'high-contrast': extractThemeColors(cssContent, '[data-theme="high-contrast"]'),
  'old-guy': extractThemeColors(cssContent, '[data-theme="old-guy"]'),
};

const textColorVars: (keyof ThemeColors)[] = [
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--parchment',
];

const backgroundVars: (keyof ThemeColors)[] = [
  '--bg-primary',
  '--card-bg',
];

// ─── Property Test ──────────────────────────────────────────────────────────

describe('Feature: ux-polish-improvements, Property 8: All text colors meet WCAG AA contrast', () => {
  // Build all combinations: theme × text color × background
  const combinations: Array<{
    theme: string;
    textVar: string;
    bgVar: string;
    textColor: string;
    bgColor: string;
  }> = [];

  for (const [themeName, colors] of Object.entries(themes)) {
    for (const textVar of textColorVars) {
      for (const bgVar of backgroundVars) {
        const textColor = colors[textVar];
        const bgColor = colors[bgVar];
        if (textColor && bgColor) {
          combinations.push({ theme: themeName, textVar, bgVar, textColor, bgColor });
        }
      }
    }
  }

  /**
   * **Validates: Requirements 10.4**
   *
   * For each text color variable in each theme, the contrast ratio against
   * typical backgrounds must be at least 4.5:1 (WCAG AA for normal text).
   */
  it('all text color variables meet WCAG AA 4.5:1 contrast against backgrounds in every theme', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...combinations),
        ({ theme, textVar, bgVar, textColor, bgColor }) => {
          const ratio = contrastRatio(textColor, bgColor);
          expect(
            ratio,
            `${theme}: ${textVar} (${textColor}) against ${bgVar} (${bgColor}) has contrast ratio ${ratio.toFixed(2)}:1, expected >= 4.5:1`
          ).toBeGreaterThanOrEqual(4.5);
        }
      ),
      { numRuns: 200 } // Run enough to cover all combinations multiple times
    );
  });

  // Also provide a deterministic check of every combination for clear failure reporting
  for (const { theme, textVar, bgVar, textColor, bgColor } of combinations) {
    it(`${theme}: ${textVar} (${textColor}) vs ${bgVar} (${bgColor}) >= 4.5:1`, () => {
      const ratio = contrastRatio(textColor, bgColor);
      expect(
        ratio,
        `Contrast ratio is ${ratio.toFixed(2)}:1, expected >= 4.5:1`
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
});
