/**
 * Pure logic for hash-based routing.
 * Provides parsing and formatting of URL hash strings for page navigation.
 */

export const VALID_PAGES = ['character', 'combat', 'retinue', 'estate', 'endeavours', 'advancement', 'settings'] as const;

export type ValidPage = (typeof VALID_PAGES)[number];

export const PAGE_DEFAULT_SUBTABS: Partial<Record<ValidPage, string>> = {
  character: 'identity',
  estate: 'wealth',
  retinue: 'hirelings',
};

/**
 * Parse a URL hash string into page and sub-tab values.
 * - Returns the page and subTab if valid.
 * - Falls back to 'character' for invalid pages.
 * - Falls back to page's default sub-tab for invalid sub-tabs.
 */
export function parseHash(hash: string): { page: ValidPage; subTab: string | null } {
  // Remove leading '#' if present
  const stripped = hash.startsWith('#') ? hash.slice(1) : hash;

  if (!stripped) {
    return { page: 'character', subTab: PAGE_DEFAULT_SUBTABS['character'] ?? null };
  }

  const segments = stripped.split('/');
  const rawPage = segments[0]?.toLowerCase() ?? '';
  const rawSubTab = segments[1] ?? null;

  // Validate page
  const page: ValidPage = VALID_PAGES.includes(rawPage as ValidPage)
    ? (rawPage as ValidPage)
    : 'character';

  // If page was invalid, use default sub-tab for character
  if (!VALID_PAGES.includes(rawPage as ValidPage)) {
    return { page: 'character', subTab: PAGE_DEFAULT_SUBTABS['character'] ?? null };
  }

  // If no sub-tab provided, use page's default (or null if page has no default)
  if (!rawSubTab) {
    return { page, subTab: PAGE_DEFAULT_SUBTABS[page] ?? null };
  }

  // Return the sub-tab as provided (valid sub-tab string)
  return { page, subTab: rawSubTab };
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
