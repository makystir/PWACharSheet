import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseHash, formatHash, VALID_PAGES, PAGE_DEFAULT_SUBTABS, type ValidPage } from '../hash-route';

// Feature: ux-improvements, Property 11: Hash routing round-trip
// **Validates: Requirements 14.1, 14.2**

describe('Property 11: Hash routing round-trip', () => {
  it('for any valid page with a sub-tab, formatHash then parseHash produces the same page and sub-tab', () => {
    const pageArb = fc.constantFrom(...VALID_PAGES);
    // Generate alphanumeric sub-tab strings (non-empty, no slashes or special chars)
    const subTabArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/);

    fc.assert(
      fc.property(pageArb, subTabArb, (page, subTab) => {
        const hash = formatHash(page, subTab);
        const parsed = parseHash(hash);

        // Hash format SHALL be #<page>/<subtab> when sub-tab is specified
        expect(hash).toBe(`#${page}/${subTab}`);
        // Round-trip: parsing produces the same page and sub-tab
        expect(parsed.page).toBe(page);
        expect(parsed.subTab).toBe(subTab);
      }),
      { numRuns: 100 }
    );
  });

  it('for any valid page without a sub-tab, formatHash produces #<page> and parseHash returns page default sub-tab', () => {
    const pageArb = fc.constantFrom(...VALID_PAGES);

    fc.assert(
      fc.property(pageArb, (page) => {
        const hash = formatHash(page, null);

        // Hash format SHALL be #<page> when no sub-tab is specified
        expect(hash).toBe(`#${page}`);

        const parsed = parseHash(hash);
        expect(parsed.page).toBe(page);

        // Pages with defaults get their default sub-tab; pages without get null
        const expectedSubTab = PAGE_DEFAULT_SUBTABS[page as ValidPage] ?? null;
        expect(parsed.subTab).toBe(expectedSubTab);
      }),
      { numRuns: 100 }
    );
  });

  it('round-trip holds: for any valid page and explicit sub-tab, format then parse is identity', () => {
    const pageArb = fc.constantFrom(...VALID_PAGES);
    const subTabArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/);

    fc.assert(
      fc.property(pageArb, subTabArb, (page, subTab) => {
        const hash = formatHash(page, subTab);
        const parsed = parseHash(hash);

        // The round-trip produces identical page and sub-tab
        expect(parsed.page).toBe(page);
        expect(parsed.subTab).toBe(subTab);
      }),
      { numRuns: 100 }
    );
  });

  it('for any invalid page string, parseHash falls back to character page with its default sub-tab', () => {
    // Generate strings that are NOT valid pages
    const invalidPageArb = fc
      .stringMatching(/^[a-z]{1,20}$/)
      .filter((s) => !(VALID_PAGES as readonly string[]).includes(s));

    fc.assert(
      fc.property(invalidPageArb, (invalidPage) => {
        const hash = `#${invalidPage}`;
        const parsed = parseHash(hash);

        expect(parsed.page).toBe('character');
        expect(parsed.subTab).toBe(PAGE_DEFAULT_SUBTABS['character'] ?? null);
      }),
      { numRuns: 100 }
    );
  });
});
