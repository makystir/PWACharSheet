import type { Character } from '../types/character';

/**
 * Link-size thresholds and portrait/log trimming for GM share links.
 *
 * A shareable URL has practical length limits, so the link variant of a
 * character drops the heaviest, non-essential data (portrait image + event
 * log). The snapshot variant (file/clipboard) keeps everything.
 */

/** Below SOFT: link is comfortable. Between SOFT and HARD: warn. */
export const SHARE_SOFT_LIMIT = 8000;
/** At/above HARD: the link is too long to rely on. */
export const SHARE_HARD_LIMIT = 16000;

export type ShareLinkLength = 'none' | 'soft' | 'hard';

/**
 * Produce the link variant of a character: portrait and event log removed to
 * keep the encoded URL small. Does not mutate the input. The snapshot export
 * path keeps both fields.
 */
export function trimForLink(character: Character): Character {
  return { ...character, portrait: '', eventLog: [] };
}

/**
 * Classify a full view-link href by length. Uses `>=` so a length exactly at a
 * limit falls into the heavier bucket.
 */
export function classifyLinkLength(hrefLength: number): ShareLinkLength {
  if (hrefLength >= SHARE_HARD_LIMIT) return 'hard';
  if (hrefLength >= SHARE_SOFT_LIMIT) return 'soft';
  return 'none';
}
