/**
 * Help content registry for contextual help popovers.
 * Each entry provides a concise explanation (≤280 characters) of a game concept.
 */

const helpContent: Record<string, string> = {
  'status-tier':
    'Your Status tier (Gold, Silver, or Brass) reflects your character\'s social standing in WFRP 4e. It determines your lifestyle costs, the quality of lodgings, and how many endeavour slots you receive during downtime.',
  'slot-calculation':
    'Endeavour slots per downtime period are based on your Status tier: Gold = 3 slots, Silver = 2 slots, Brass = 1 slot. You can spend each slot on one endeavour activity between adventures.',
  'career-advancement':
    'Advance your career by spending XP on career skills and characteristics. Complete all advances in your current level to unlock the next career level or switch to a related career.',
  'yenlui-balance':
    'Yenlui is the Elven concept of inner balance between Light (Cadai) and Dark (Cytharai). Your current state affects sword-dancing difficulty and roleplaying guidance. Shifts occur through actions and tests.',
};

/**
 * Retrieve help text for a given concept identifier.
 * Returns the help string if found, or an empty string if the concept ID is unknown.
 */
export function getHelpContent(conceptId: string): string {
  return helpContent[conceptId] ?? '';
}
