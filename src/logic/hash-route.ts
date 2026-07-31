/**
 * Pure logic for hash-based routing.
 * Provides parsing and formatting of URL hash strings for page navigation.
 */

export const VALID_PAGES = ['character', 'combat', 'retinue', 'estate', 'endeavours', 'advancement', 'settings'] as const;

export type ValidPage = (typeof VALID_PAGES)[number];

export const PAGE_DEFAULT_SUBTABS: Partial<Record<ValidPage, string>> = {};

/**
 * Parse a URL hash string into page and sub-tab values.
 * - Returns the page and subTab if valid.
 * - Falls back to 'character' for invalid pages.
 * - Returns null subTab when no sub-tab is specified (pages handle their own defaults).
 */
export function parseHash(hash: string): { page: ValidPage; subTab: string | null } {
  // Remove leading '#' if present
  const stripped = hash.startsWith('#') ? hash.slice(1) : hash;

  if (!stripped) {
    return { page: 'character', subTab: null };
  }

  const segments = stripped.split('/');
  const rawPage = segments[0]?.toLowerCase() ?? '';
  const rawSubTab = segments[1] ?? null;

  // Validate page
  const page: ValidPage = VALID_PAGES.includes(rawPage as ValidPage)
    ? (rawPage as ValidPage)
    : 'character';

  // If page was invalid, return character with no sub-tab
  if (!VALID_PAGES.includes(rawPage as ValidPage)) {
    return { page: 'character', subTab: null };
  }

  // Return sub-tab as provided (null if not in hash)
  return { page, subTab: rawSubTab || null };
}

/**
 * Format a page and optional sub-tab into a URL hash string.
 * - Returns `#<page>` when no sub-tab is specified.
 * - Returns `#<page>/<subtab>` when a sub-tab is specified.
 */
export function formatHash(page: string, subTab?: string | null): string {
  if (subTab) {
    return `#${page}/${subTab}`;
  }
  return `#${page}`;
}
