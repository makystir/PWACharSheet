import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Old Guy Mode scaling unit tests.
 * Validates: Requirements 12.1, 12.2, 12.3
 *
 * Since jsdom has limited CSS support (getComputedStyle doesn't process
 * stylesheets), we read the CSS file as text and verify the transform-based
 * rules exist with correct values.
 */

const globalCssPath = resolve(__dirname, '../styles/global.css');
const cssContent = readFileSync(globalCssPath, 'utf-8');

/**
 * Extract the CSS rule block for a given selector from the CSS content.
 */
function extractRuleBlock(css: string, selector: string): string | null {
  // Escape brackets and special chars in selector for regex
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 's');
  const match = css.match(regex);
  return match ? match[1] : null;
}

describe('Old Guy Mode scaling CSS', () => {
  const oldGuyRootBlock = extractRuleBlock(cssContent, '[data-theme="old-guy"] #root');

  it('old-guy #root rule block exists in global.css', () => {
    expect(oldGuyRootBlock).not.toBeNull();
  });

  describe('transform scale is applied when old-guy theme is active', () => {
    it('applies transform: scale(1.2)', () => {
      expect(oldGuyRootBlock).toMatch(/transform\s*:\s*scale\(1\.2\)/);
    });

    it('applies transform-origin: top left', () => {
      expect(oldGuyRootBlock).toMatch(/transform-origin\s*:\s*top\s+left/);
    });

    it('does NOT use zoom: 1.2 (replaced with transform)', () => {
      expect(oldGuyRootBlock).not.toMatch(/zoom\s*:\s*1\.2/);
    });
  });

  describe('container dimensions are adjusted for scale factor', () => {
    it('sets width to calc(100% / 1.2) to prevent horizontal overflow', () => {
      expect(oldGuyRootBlock).toMatch(/width\s*:\s*calc\(\s*100%\s*\/\s*1\.2\s*\)/);
    });

    it('sets min-height to calc(100vh / 1.2) for full viewport coverage', () => {
      expect(oldGuyRootBlock).toMatch(/min-height\s*:\s*calc\(\s*100vh\s*\/\s*1\.2\s*\)/);
    });
  });

  describe('no unexpected scrollbars appear', () => {
    it('width is constrained to 83.33% (100/1.2) preventing horizontal overflow', () => {
      // The width calc(100% / 1.2) = 83.33% ensures the scaled content
      // (83.33% * 1.2 = 100%) exactly fills the viewport width
      expect(oldGuyRootBlock).toMatch(/width\s*:\s*calc\(\s*100%\s*\/\s*1\.2\s*\)/);
    });

    it('no overflow: scroll or overflow: auto is set on #root for old-guy theme', () => {
      // Verify no explicit overflow properties that would create scrollbars
      expect(oldGuyRootBlock).not.toMatch(/overflow\s*:\s*(scroll|auto)/);
      expect(oldGuyRootBlock).not.toMatch(/overflow-x\s*:\s*(scroll|auto)/);
      expect(oldGuyRootBlock).not.toMatch(/overflow-y\s*:\s*(scroll|auto)/);
    });

    it('global html/body overflow-x: hidden prevents any horizontal scrollbar', () => {
      // Verify the global rule that prevents horizontal scroll exists
      expect(cssContent).toMatch(/html\s*,\s*body\s*\{[^}]*overflow-x\s*:\s*hidden/s);
    });
  });
});
