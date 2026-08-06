/**
 * Endeavour template definitions and lookup logic.
 * Provides pre-filled data for common endeavour types based on WFRP4e rules.
 */

export interface EndeavourTemplate {
  type: string;
  notes: string;
  cost: Record<string, string> | null; // keyed by tier category: "Brass", "Silver", "Gold"
}

export const ENDEAVOUR_TEMPLATES: EndeavourTemplate[] = [
  {
    type: 'Training',
    notes: 'Spend time training a skill or learning from a tutor. Advance one skill by 1 if you have a suitable trainer.',
    cost: { 'Brass': '—', 'Silver': '—', 'Gold': '—' },
  },
  {
    type: 'Income',
    notes: 'Work during downtime to earn money based on your career and status tier.',
    cost: null, // Income generates money, no cost
  },
  {
    type: 'Research',
    notes: 'Spend time in a library or with scholars. Make an Intelligence test to gain information on a topic.',
    cost: { 'Brass': '—', 'Silver': '1d10 s', 'Gold': '1 GC' },
  },
  {
    type: 'Crafting',
    notes: 'Create an item using a Trade skill. Duration and cost depend on item complexity.',
    cost: { 'Brass': 'Varies', 'Silver': 'Varies', 'Gold': 'Varies' },
  },
  {
    type: 'Healing',
    notes: 'Recover from injuries or seek medical treatment. Heal 1 wound per day of rest, or seek a physician.',
    cost: { 'Brass': '—', 'Silver': '6d', 'Gold': '1 GC' },
  },
  {
    type: 'Socialising',
    notes: 'Spend time making contacts, gathering rumours, or building relationships in your social circle.',
    cost: { 'Brass': '1d10 d', 'Silver': '1d10 s', 'Gold': '1d10 GC' },
  },
];

/**
 * Look up a template by type and populate fields based on the character's status tier.
 *
 * Behavior:
 * 1. Finds template by type name (case-insensitive match)
 * 2. If template has a cost and statusTier is provided: extracts tier category (e.g. "Brass 3" → "Brass") and looks up cost
 * 3. If template has cost but no statusTier: leaves cost empty, includes warning
 * 4. If template has null cost (like Income): cost is always empty
 * 5. Returns { type, notes, cost, warning? }
 */
export function applyEndeavourTemplate(
  templateType: string,
  statusTier: string | undefined,
): { type: string; notes: string; cost: string; warning?: string } {
  const template = ENDEAVOUR_TEMPLATES.find(
    t => t.type.toLowerCase() === templateType.toLowerCase(),
  );

  if (!template) {
    return { type: templateType, notes: '', cost: '', warning: 'Unknown template type' };
  }

  // If template has no cost (e.g. Income generates money)
  if (template.cost === null) {
    return { type: template.type, notes: template.notes, cost: '' };
  }

  // Template has cost — check if statusTier is provided
  if (!statusTier || statusTier.trim() === '') {
    return {
      type: template.type,
      notes: template.notes,
      cost: '',
      warning: 'Status tier needed for cost calculation',
    };
  }

  // Extract tier category from status string (e.g. "Brass 3" → "Brass")
  const tierCategory = extractTierCategory(statusTier);

  if (!tierCategory || !(tierCategory in template.cost)) {
    return {
      type: template.type,
      notes: template.notes,
      cost: '',
      warning: 'Status tier needed for cost calculation',
    };
  }

  return {
    type: template.type,
    notes: template.notes,
    cost: template.cost[tierCategory],
  };
}

/**
 * Extract the tier category (Brass, Silver, Gold) from a status tier string.
 * Case-insensitive matching — e.g. "brass 3" → "Brass", "Silver 2" → "Silver".
 */
function extractTierCategory(statusTier: string): string | null {
  const lower = statusTier.toLowerCase();
  if (lower.includes('gold')) return 'Gold';
  if (lower.includes('silver')) return 'Silver';
  if (lower.includes('brass')) return 'Brass';
  return null;
}
